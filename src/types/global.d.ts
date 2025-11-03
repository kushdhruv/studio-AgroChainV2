/// <reference types="viem" />
/// <reference types="wagmi" />

declare module 'next/config' {
  const getConfig: () => {
    publicRuntimeConfig: {
      [key: string]: any;
    };
    serverRuntimeConfig: {
      [key: string]: any;
    };
  };
  export default getConfig;
}

declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.ico' {
  const content: string;
  export default content;
}