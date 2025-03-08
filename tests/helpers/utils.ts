import { EthProver, EthSelfRollup, Gateway, GatewayRequest } from '@unruggable/gateways';
import { Foundry } from '@adraffy/blocksmith';
import { Contract, JsonRpcProvider, hexlify, randomBytes } from 'ethers';
import { serve } from '@resolverworks/ezccip/serve';
import * as dotenv from 'dotenv'
dotenv.config()

// Setup for initalizing Foundry, deploying our basic verifier contract (to test against), and creating a prover function to interface with the verifier
export const setup = async () => {

  const foundry = await Foundry.launch({
    infoLog: true,
    procLog: true,
  });

  if (!process.env.SEPOLIA_PROVIDER_URL) {
    throw new Error("SEPOLIA_PROVIDER_URL is not set in .env file");
  }

  const rollup = new EthSelfRollup(foundry.provider);

  // Use the latest or alternatively advance the anvil chain state to use finalized
  rollup.latestBlockTag = "latest";

  const gateway = new Gateway(rollup);
  const ccip = await serve(gateway, { protocol: 'raw', log: true });
  
  const GatewayVM = await foundry.deploy({ import: '@unruggable-test/contracts/GatewayVM.sol' });
  const hooks = await foundry.deploy({ import: '@unruggable-test/contracts/eth/EthVerifierHooks.sol' });

  // Deploy the SelfVerifier
  const verifier = await foundry.deploy({
    import: '@unruggable-test/contracts/SelfVerifier.sol',
    args: [[ccip.endpoint], rollup.defaultWindow, hooks],
    libs: { GatewayVM },
  });

  return {
    foundry,
    verifier,
    async prover() {
      // create an snapshot to prove against
      // can be invoked multiple times to observe changes
      const prover = await EthProver.latest(foundry.provider);
      const stateRoot = await prover.fetchStateRoot();
      return {
        prover,
        stateRoot,
        async prove(req: GatewayRequest) {
          const vm = await prover.evalRequest(req);

          const proofSeq = await prover.prove(vm.needs);
          const outputs = await vm.resolveOutputs();

          const verificationResponse = await verifier.verify(
            req.toTuple(),
            stateRoot,
            proofSeq.proofs,
            proofSeq.order
          );

          const vOutputs = verificationResponse.outputs.toArray();
          
          return { vOutputs, ...vm };
        },
      };
    },
    ccip
  };
}