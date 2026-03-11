import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import styles from "./properties-panel.module.scss";

interface HeartbeatRunRow {
  id: string;
  status: string;
  message: string | null;
  startedAt: string | Date;
}

export function PropertiesPanel({ heartbeatRuns = [] }: { heartbeatRuns?: HeartbeatRunRow[] }) {
  const latestRun = heartbeatRuns[0];

  return (
    <div className={styles.propertiesPanelContainer}>
      <Card>
        <CardHeader>
          <CardTitle>Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.row}>
            <span className={styles.rowKey}>Status</span>
            <span className={styles.rowValue}>Done</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowKey}>Priority</span>
            <span className={styles.rowValue}>Medium</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowKey}>Assignee</span>
            <span className={styles.rowValue}>CEO</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowKey}>Project</span>
            <span className={styles.rowValue}>Frontend</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Linked Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>1 pending hire approval</CardDescription>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cost Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>Input 2.1k · Output 0.7k · $0.11</CardDescription>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Heartbeat Trace</CardTitle>
        </CardHeader>
        <CardContent>
          {latestRun ? (
            <>
              <div className={styles.row}>
                <span className={styles.rowKey}>Status</span>
                <span className={styles.rowValue}>{latestRun.status}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowKey}>Started</span>
                <span className={styles.rowValue}>{new Date(latestRun.startedAt).toLocaleString()}</span>
              </div>
              <CardDescription>{latestRun.message ?? "No message provided."}</CardDescription>
            </>
          ) : (
            <CardDescription>No heartbeat runs yet.</CardDescription>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
