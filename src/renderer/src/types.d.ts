declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      src?: string;
      allowpopups?: string | boolean;
      style?: React.CSSProperties;
    };
  }
}
