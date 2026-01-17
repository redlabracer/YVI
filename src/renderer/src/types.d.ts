
declare global {
  interface Window {
    electron: any
    api: {
      log: (level: string, message: string, meta?: any) => void
    }
  }
}

declare namespace JSX {

  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      src?: string;
      allowpopups?: string | boolean;
      style?: React.CSSProperties;
    };
  }
}
