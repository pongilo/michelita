import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <div className="bg-michelita-purple min-h-screen">
      <header className="p-10">
        <Link to="/">
          <img src="/logo.svg" alt="Michelita" className="h-16 mx-auto" />
        </Link>
      </header>
      <Outlet />
    </div>
  ),
});
