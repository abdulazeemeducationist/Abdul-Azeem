import { useGetAdminStats } from "@workspace/api-client-react";
import { BookOpen, Users, FileText, HelpCircle, BarChart2, Layers, Hash, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const statCards = [
  { key: "totalUsers" as const, label: "Students", icon: Users, color: "text-blue-500" },
  { key: "totalCourses" as const, label: "Courses", icon: BookOpen, color: "text-violet-500" },
  { key: "totalSubjects" as const, label: "Subjects", icon: FileText, color: "text-indigo-500" },
  { key: "totalChapters" as const, label: "Chapters", icon: Layers, color: "text-cyan-500" },
  { key: "totalTopics" as const, label: "Topics", icon: Hash, color: "text-teal-500" },
  { key: "totalQuestions" as const, label: "Questions", icon: HelpCircle, color: "text-green-500" },
  { key: "totalAttempts" as const, label: "Attempts", icon: Target, color: "text-orange-500" },
  { key: "averageScore" as const, label: "Avg Score", icon: BarChart2, color: "text-pink-500", isPercent: true },
];

export default function DashboardPage() {
  const { data: stats, isLoading } = useGetAdminStats();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your exam prep platform</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ key, label, icon: Icon, color, isPercent }) => (
          <div key={key} className="bg-card border border-card-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold text-foreground">
                {isPercent
                  ? `${(stats?.averageScore ?? 0).toFixed(1)}%`
                  : (stats?.[key] ?? 0).toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
