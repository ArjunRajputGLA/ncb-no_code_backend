'use client';

import WorkflowBuilder from "@/components/WrokFlowBuilder";
import { useParams } from "next/navigation";

export default function WorkflowPage() {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <main>
      <WorkflowBuilder projectId={projectId} />
    </main>
  );
}
