import { translator as t } from "@data/translations/ar";

export const navLinks = [
  {
    name: "dashboard",
    label: t.navigation.dashboard,
    icon: "home",
    to: "/dashboard",
  },
  {
    name: "workflows",
    label: t.navigation.workflows,
    icon: "workflow",
    roles: ["professor"],
    children: [
      { name: "new", label: t.workflow.new, icon: "new", to: "/workflows/new" },
      {
        name: "my workflows",
        label: t.workflow.myWorkflows,
        icon: "myWorkflows",
        to: "/workflows/my-workflows",
      },
    ],
  },
  {
    name: "requests",
    icon: "inbox",
    label: t.navigation.requests,
    roles: ["professor", "department_manager", "administrator"],
    children: [
      {
        name: "inbox",
        label: t.request.inbox,
        icon: "email",
        to: "/requests/inbox",
        badge: "inboxUnresponded",
      },
      {
        name: "drafts",
        label: t.request.drafts,
        icon: "pen",
        to: "/requests/drafts",
        badge: "drafts",
      },
      {
        name: "submitted",
        label: t.request.submitted,
        icon: "submitted",
        to: "/requests/submitted",
      },
    ],
  },
  {
    name: "completed",
    icon: "submitted",
    label: t.dean.inbox,
    to: "/dean/completed",
    roles: ["dean"],
    badge: "deanPending",
  },
  {
    name: "settings",
    label: t.navigation.settings,
    icon: "settings",
    to: "/settings",
  },
  {
    name: "logout",
    label: t.navigation.logout,
    icon: "logout",
    to: "/login",
  },
];
