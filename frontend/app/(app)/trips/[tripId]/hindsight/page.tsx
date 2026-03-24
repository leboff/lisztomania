"use client";
import { use, useEffect, useState } from "react";
import { checklistService } from "@/services/checklist.service";
import { HindsightReview } from "@/components/hindsight/HindsightReview";
import { PageHeader } from "@/components/layout/PageHeader";
import type { ChecklistItem } from "@/types";

export default function HindsightPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checklistService.list(tripId).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [tripId]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Trip Review" showBack />
        <div className="px-4 py-4 space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Trip Review" showBack />
      <HindsightReview tripId={tripId} items={items} />
    </div>
  );
}
