declare module 'solc' {
  const solc: {
    compile: (input: string) => string;
  };
  export default solc;
}

declare module 'solc/wrapper' {
  export function setupMethods(input: string): {
    compile: (input: string) => string;
  };
  export function loadRemoteVersion(version: string, callback: (err: Error | null, solc: any) => void): void;
}

declare global {
  interface Window {
    Module: {
      cwrap: (name: string, returnType: string, paramTypes: string[]) => (input: string) => string;
    }
  }
} 