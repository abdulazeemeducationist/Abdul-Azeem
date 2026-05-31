import { useGetAdminStats } from "@workspace/api-client-react";
import { BookOpen, Users, FileText, HelpCircle, BarChart2, Layers, Hash, Target, UserCog } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

type StatKey = "totalUsers" | "totalCourses" | "totalSubjects" | "totalChapters" | "totalTopics" | "totalQuestions" | "totalAttempts" | "averageScore";

const statCards: { key: StatKey; label: string; icon: React.ElementType; color: string; isPercent?: boolean; href: string }[] = [
  { key: "totalUsers", label: "Students", icon: Users, color: "text-blue-500", href: "/students" },
  { key: "totalCourses", label: "Programs", icon: BookOpen, color: "text-violet-500", href: "/courses" },
  { key: "totalSubjects", label: "Courses", icon: FileText, color: "text-indigo-500", href: "/courses" },
  { key: "totalChapters", label: "Chapters", icon: Layers, color: "text-cyan-500", href: "/courses" },
  { key: "totalTopics", label: "Topics", icon: Hash, color: "text-teal-500", href: "/courses" },
  { key: "totalQuestions", label: "Questions", icon: HelpCircle, color: "text-green-500", href: "/courses" },
  { key: "totalAttempts", label: "Attempts", icon: Target, color: "text-orange-500", href: "/students" },
  { key: "averageScore", label: "Avg Score", icon: BarChart2, color: "text-pink-500", isPercent: true, href: "/students" },
];

export default function DashboardPage() {
  const { data: stats, isLoading } = useGetAdminStats();
  const extStats = stats as (typeof stats & { totalStaff?: number }) | undefined;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your exam prep platform</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Staff card */}
        <Link href="/staff" className="bg-card border border-card-border rounded-xl p-5 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer block">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Staff</span>
            <UserCog className="w-4 h-4 text-amber-500" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold text-foreground">{(extStats?.totalStaff ?? 0).toLocaleString()}</p>
          )}
        </Link>

        {statCards.map(({ key, label, icon: Icon, color, isPercent, href }) => (
          <Link key={key} href={href} className="bg-card border border-card-border rounded-xl p-5 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer block">
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
          </Link>
        ))}
      </div>
    </div>
  );
}
