import React, { useState, useEffect } from "react";
import { Scoped, always, maybe } from "kremling";
import AppStatusOverride from "./app-status-override.component";
import { evalDevtoolsCmd, evalCmd } from "../inspected-window.helper.js";

const OFF = "off",
  ON = "on",
  LIST = "list",
  PAGE = "page";

export default function Apps(props) {
  const sortedApps = sortApps(props.apps);

  const [hovered, setHovered] = useState();
  const [overlaysEnabled, setOverlaysEnabled] = useState("off");

  useEffect(() => {
    if (hovered) {
      overlayApp(hovered);
      return () => deOverlayApp(hovered);
    }
  }, [hovered]);

  useEffect(() => {
    document.body.classList.add(props.theme);
    return () => {
      document.body.classList.remove(props.theme);
    };
  }, [props.theme]);

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
          {sortedApps.map(app => (
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
      const statusA =
        a.status === "MOUNTED" || !!a.devtools.activeWhenForced ? 1 : 0;
      const statusB =
        b.status === "MOUNTED" || !!b.devtools.activeWhenForced ? 1 : 0;
      if (statusA > statusB) {
        return -1;
      } else if (statusA < statusB) {
        return 1;
      } else {
        return 0;
      }
    });
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
body {
  font-family: sans-serif;
}

body.dark {
  background-color: #272822;
  color: #F8F8F2;
}

& .table {
  border-collapse: collapse;
  width: 100%;
}

& .table td, .table th {
  padding: 2px 8px;
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
