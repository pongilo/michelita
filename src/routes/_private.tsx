import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_private")({
  component: () => (
    <>
      <div className="drawer lg:drawer-open">
        <input id="my-drawer-3" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content">
          <Outlet />
        </div>
        <div className="drawer-content flex flex-col items-center justify-center">
          <label htmlFor="my-drawer-3" className="btn drawer-button lg:hidden">
            Open drawer
          </label>
        </div>
        <div className="drawer-side">
          <label htmlFor="my-drawer-3" aria-label="close sidebar" className="drawer-overlay"></label>
          <ul className="menu bg-base-200 min-h-full w-80 p-4">
            <li><a>Sidebar Item 1</a></li>
            <li><a>Sidebar Item 2</a></li>
          </ul>
        </div>
      </div>
    </>
  ),
});
