import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import { isAuthenticated } from "@/lib/auth";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import CoursesPage from "@/pages/courses";
import SubjectsPage from "@/pages/subjects";
import ChaptersPage from "@/pages/chapters";
import TopicsPage from "@/pages/topics";
import QuestionsPage from "@/pages/questions";
import QuestionFormPage from "@/pages/question-form";
import StudentsPage from "@/pages/students";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  if (!isAuthenticated()) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
        <Route path="/courses" component={() => <ProtectedRoute component={CoursesPage} />} />
        <Route path="/courses/:courseId/subjects" component={() => <ProtectedRoute component={SubjectsPage} />} />
        <Route path="/subjects/:subjectId/chapters" component={() => <ProtectedRoute component={ChaptersPage} />} />
        <Route path="/chapters/:chapterId/topics" component={() => <ProtectedRoute component={TopicsPage} />} />
        <Route path="/topics/:topicId/questions" component={() => <ProtectedRoute component={QuestionsPage} />} />
        <Route path="/questions/new" component={() => <ProtectedRoute component={QuestionFormPage} />} />
        <Route path="/questions/:questionId/edit" component={() => <ProtectedRoute component={QuestionFormPage} />} />
        <Route path="/students" component={() => <ProtectedRoute component={StudentsPage} />} />
        <Route path="/" component={() => <Redirect to={isAuthenticated() ? "/dashboard" : "/login"} />} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
