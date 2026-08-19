import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AttendancePage from "@/pages/AttendancePage";
import AdminPage from "@/pages/AdminPage";
import SignupPage from "@/pages/SignupPage";
import LeavePage from "@/pages/LeavePage";
import NotFound from "@/pages/not-found";
import { isDeviceNotPaired } from "@/lib/deviceAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A device-not-paired 401 will never succeed on retry (the token is
      // simply absent/invalid) — retrying it just delays the kiosk's
      // pairing screen from appearing. Other errors still get a couple of
      // retries in case it's a transient network blip.
      retry: (failureCount, error) => !isDeviceNotPaired(error) && failureCount < 2,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={AttendancePage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/leave-request/:orgSlug" component={LeavePage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
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
