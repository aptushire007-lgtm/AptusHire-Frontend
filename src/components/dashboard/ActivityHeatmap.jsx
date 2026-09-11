import { useMemo } from "react";
import { Activity } from "lucide-react";

export default function ActivityHeatmap({ applications = [], interviews = [] }) {
  // Generate past 84 days (12 weeks)
  const heatmapData = useMemo(() => {
    const today = new Date();
    const days = [];

    // Map timestamps to count
    const countByDay = new Map();
    for (const app of applications) {
      if (app.createdAt) {
        const key = new Date(app.createdAt).toISOString().split("T")[0];
        countByDay.set(key, (countByDay.get(key) || 0) + 1);
      }
    }
    for (const interview of interviews) {
      if (interview.interviewAt) {
        const key = new Date(interview.interviewAt).toISOString().split("T")[0];
        countByDay.set(key, (countByDay.get(key) || 0) + 1);
      }
    }

    for (let i = 83; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const count = countByDay.get(key) || 0;
      days.push({
        date: key,
        displayDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count,
      });
    }
    return days;
  }, [applications, interviews]);

  const getIntensityClass = (count) => {
    if (count === 0) return "bg-[#E8F2EC]";
    if (count === 1) return "bg-[#E4F8C6]";
    if (count === 2) return "bg-[#5B6B63]";
    return "bg-[#176B45]";
  };

  return (
    <div className="rounded-[14px] border border-[#E5EBE7] bg-white p-5 text-[#176B45] shadow-[0_1px_4px_rgba(27,67,50,0.07)] dark:border-[#E5EBE7] dark:bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#176B45]" />
          <h3 className="font-display text-sm font-bold text-[#176B45]">
            Application &amp; Interview Activity
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#64736A]">
          <span>Less</span>
          <span className="h-2.5 w-2.5 rounded-xs bg-[#E8F2EC]" />
          <span className="h-2.5 w-2.5 rounded-xs bg-[#E4F8C6]" />
          <span className="h-2.5 w-2.5 rounded-xs bg-[#5B6B63]" />
          <span className="h-2.5 w-2.5 rounded-xs bg-[#176B45]" />
          <span>More</span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="grid grid-flow-col grid-rows-7 gap-1.5 min-w-[480px]">
          {heatmapData.map((d, i) => (
            <div
              key={d.date}
              title={`${d.displayDate}: ${d.count} action${d.count === 1 ? "" : "s"}`}
              className={`h-3 w-3 rounded-xs ${getIntensityClass(d.count)} transition-transform hover:scale-125 cursor-pointer`}
            />
          ))}
        </div>
      </div>

      <p className="mt-3 text-sm text-[#64736A]">
        12-week activity log across your verified applications and AI interview sessions.
      </p>
    </div>
  );
}

