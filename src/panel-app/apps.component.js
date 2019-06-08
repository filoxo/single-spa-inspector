import React, { useState, useEffect, useMemo } from "react";
import { Scoped, always, maybe } from "kremling";
import AppStatusOverride from "./app-status-override.component";
import { evalDevtoolsCmd, evalCmd } from "../inspected-window.helper.js";

const OFF = "off",
  ON = "on",
  LIST = "list",
  PAGE = "page";

export default function Apps(props) {
  const { mounted: mountedApps, other: otherApps } = useMemo(
    () => groupApps(props.apps),
    [props.apps]
  );
  const [hovered, setHovered] = useState();
  const [overlaysEnabled, setOverlaysEnabled] = useState("off");

  useEffect(() => {
    if (overlaysEnabled === LIST && hovered) {
      overlayApp(hovered);
      return () => {
        deOverlayApp(hovered);
      };
    }
  }, [overlaysEnabled, hovered]);

  useEffect(() => {
    if (overlaysEnabled === ON) {
      mountedApps.forEach(app => overlayApp(app));
      otherApps.forEach(app => deOverlayApp(app));
      return () => {
        mountedApps.forEach(app => deOverlayApp(app));
      };
    }
  }, [overlaysEnabled, mountedApps, otherApps]);

  return (
    <Scoped css={css}>
      <div>
        <label htmlFor="overlayEnabledSelect">Overlays: </label>
        <select
          id="overlayEnabledSelect"
          value={overlaysEnabled}
          onChange={e => setOverlaysEnabled(e.target.value)}
        >
          <option value={OFF}>Off</option>
          <option value={ON}>On</option>
          <option value={LIST}>On list hover</option>
          <option value={PAGE}>On page hover</option>
        </select>
      </div>
      <table className={"table"}>
        <thead className="table-header">
          <tr>
            <th>App Name</th>
            <th>Status</th>
            <th>Status Overrides</th>
          </tr>
        </thead>
        <tbody>
          {mountedApps.concat(otherApps).map(app => (
            <tr
              key={app.name}
              onMouseEnter={() => setHovered(app)}
              onMouseLeave={() => setHovered()}
            >
              <td>{app.name}</td>
              <td>
                <span
                  className={always("app-status")
                    .maybe("app-mounted", app.status === "MOUNTED")
                    .maybe("app-not-mounted", app.status !== "MOUNTED")}
                >
                  {app.status.replace("_", " ").toLowerCase()}
                </span>
              </td>
              <td>
                <AppStatusOverride app={app} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Scoped>
  );
}

function sortApps(apps) {
  return [...apps]
    .sort((a, b) => {
      const nameA = a.name.toUpperCase(); // ignore upper and lowercase
      const nameB = b.name.toUpperCase(); // ignore upper and lowercase
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      // names must be equal
      return 0;
    })
    .sort((a, b) => {
      const statusA = a.status === "MOUNTED" || !!a.devtools.activeWhenForced;
      const statusB = b.status === "MOUNTED" || !!b.devtools.activeWhenForced;
      return statusA - statusB;
    });
}

function groupApps(apps) {
  const [mounted, other] = apps.reduce(
    (list, app) => {
      const group =
        app.status === "MOUNTED" || !!app.devtools.activeWhenForced ? 0 : 1;
      list[group].push(app);
      return list;
    },
    [[], []]
  );
  mounted.sort((a, b) => a.name.localeCompare(b.name));
  other.sort((a, b) => a.name.localeCompare(b.name));
  return {
    mounted,
    other
  };
}

function overlayApp(app) {
  if (
    app.status !== "SKIP_BECAUSE_BROKEN" &&
    app.status !== "NOT_LOADED" &&
    app.devtools &&
    app.devtools.overlays
  ) {
    evalDevtoolsCmd(`overlay('${app.name}')`).catch(err => {
      console.error(`Error overlaying applicaton: ${app.name}`, err);
    });
  }
}

function deOverlayApp(app) {
  if (app.devtools && app.devtools.overlays) {
    evalDevtoolsCmd(`removeOverlay('${app.name}')`).catch(err => {
      console.error(`Error removing overlay on applicaton: ${app.name}`, err);
    });
  }
}

const css = `
& .table {
  border-collapse: collapse;
  width: 100%;
}

& .table td, .table th {
  padding: 4px 8px;
}

.table tbody tr {
  transition: background-color .15s ease-out;
}

.table tbody tr:hover {
  background-color: rgba(128, 128, 128, .25);
}

& .table tbody tr:hover {
  background-color: #353B48;
}

& .table-header {
  color: #66D9EF;
  text-align: left;
}

& .app-status {
  border-radius: 3px;
  color: #fff;
  font-size: 12px;
  padding: 4px 4px 2px;
  text-transform: uppercase;  
}

& .app-mounted {
  background-color: #A6E22E;
}

& .app-not-mounted {
  background-color: #F92672;
}
`;
