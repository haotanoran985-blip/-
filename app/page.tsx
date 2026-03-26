import { WorkbenchClient } from "@/components/workbench-client";
import { getWorkbenchTemplate } from "@/lib/workbench-template";

export default function HomePage() {
  const { bodyHtml, styles, script } = getWorkbenchTemplate();

  return <WorkbenchClient bodyHtml={bodyHtml} styles={styles} script={script} />;
}
