import { useEffect } from "react";
import type { ReactNode } from "react";

import { initGlobalClientErrorReporting } from "@/utils/errorReporter";

interface IErrorReportingProviderProps {
  children: ReactNode;
}

const ErrorReportingProvider: React.FC<IErrorReportingProviderProps> = ({ children }) => {
  useEffect(() => {
    const clean = initGlobalClientErrorReporting();
    return () => {
      if (clean) {
        clean();
      }
    };
  }, []);

  return <>{children}</>;
};

export default ErrorReportingProvider;
