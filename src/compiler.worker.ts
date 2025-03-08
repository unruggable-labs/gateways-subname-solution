/// <reference lib="webworker" />

let compiler: any = null;

self.addEventListener('message', async (e) => {
  if (e.data.type === 'LOAD_COMPILER') {
    try {
      console.log('Starting compiler load process...');
      
      // Set up Module configuration BEFORE loading the script
      console.log('Setting up Module configuration...');
      (self as any).Module = {
        print: (text: string) => console.log('Module stdout:', text),
        printErr: (text: string) => console.error('Module stderr:', text),
        onRuntimeInitialized: () => {
          console.log('Module runtime initialized');
          try {
            // Create the compiler instance using the wrapper
            const soljson = (self as any).Module;
            
            // The compiler provides these functions
            compiler = {
              version: () => soljson.cwrap('solidity_version', 'string', [])(),
              license: () => soljson.cwrap('solidity_license', 'string', [])(),
              compile: (input: string) => soljson.cwrap('solidity_compile', 'string', ['string'])(input)
            };
            
            console.log('Compiler instance created, version:', compiler.version());
            self.postMessage({ type: 'COMPILER_LOADED' });
            console.log('COMPILER_LOADED message sent');
          } catch (error) {
            console.error('Error creating compiler instance:', error);
            self.postMessage({ 
              type: 'ERROR', 
              error: 'Failed to initialize compiler: ' + (error as Error).message,
              details: [{ message: (error as Error).message }]
            });
          }
        }
      };
      
      // Load the Solidity compiler after Module setup
      importScripts('https://binaries.soliditylang.org/bin/soljson-v0.8.19+commit.7dd6d404.js');
      console.log('Solidity compiler script loaded');

    } catch (error) {
      console.error('Failed to load compiler:', error);
      self.postMessage({ 
        type: 'ERROR', 
        error: 'Failed to load compiler: ' + (error as Error).message,
        details: [{ message: (error as Error).message }]
      });
    }
  } else if (e.data.type === 'COMPILE') {
    try {
      if (!compiler) {
        throw new Error('Compiler not initialized');
      }

      const input = e.data.input;
      console.log('Compiling with input:', input);
      console.log('Using compiler version:', compiler.version());

      // Use the standard JSON interface
      const output = JSON.parse(compiler.compile(JSON.stringify(input)));
      console.log('Compilation output:', output);

      if (output.errors) {
        const formattedErrors = output.errors.map((error: any) => ({
          severity: error.severity,
          message: error.formattedMessage || error.message,
          sourceLocation: error.sourceLocation
        }));
        
        console.error('Compilation errors:', formattedErrors);
        
        // If there are only warnings, proceed with the compilation
        const errors = formattedErrors.filter((error: any) => error.severity === 'error');
        if (errors.length > 0) {
          self.postMessage({ 
            type: 'ERROR', 
            error: 'Compilation failed',
            details: formattedErrors
          });
          return;
        }
      }

      const contractFile = output.contracts['contract.sol'];
      if (!contractFile) {
        throw new Error('No contracts found in compilation output');
      }

      const contractName = Object.keys(contractFile)[0];
      if (!contractName) {
        throw new Error('No contract found in compilation output');
      }

      const contract = contractFile[contractName];
      self.postMessage({ type: 'COMPILED', output });
    } catch (error) {
      console.error('Compilation error:', error);
      self.postMessage({ 
        type: 'ERROR', 
        error: 'Compilation failed: ' + (error as Error).message,
        details: [{ message: (error as Error).message }]
      });
    }
  }
}); 