// this whole exported function is stringified, so be aware
export function setupOverlayHelpers() {
  const overlayDivClassName = `single-spa_overlay--div`;
  window.__SINGLE_SPA_DEVTOOLS__.overlay = setOverlaysOnApp;
  window.__SINGLE_SPA_DEVTOOLS__.removeOverlay = removeOverlaysFromApp;

  // executed when you want to show the overlay
  function setOverlaysOnApp(appName) {
    const app = getAppByName(appName);
    const { options, selectors } = getSelectorsAndOptions(app);

    selectors.forEach(selector => {
      createOverlayWithText(selector, options, appName);
    });
  }

  // executed when you want to remove the overlay
  function removeOverlaysFromApp(appName) {
    const app = getAppByName(appName);
    const { selectors } = getSelectorsAndOptions(app);
    const overlaySelectors = selectors.map(
      selector => `${selector} .${overlayDivClassName}`
    );
    document
      .querySelectorAll(overlaySelectors)
      .forEach(overlayElem => overlayElem.parentNode.removeChild(overlayElem));
  }

  // everything after this are helper functions

  function getSelectorsAndOptions(app) {
    return {
      selectors: app.devtools.overlays.selectors
        .map(selector => {
          if (document.querySelector(selector)) {
            return selector;
          } else {
            return undefined;
          }
        })
        .filter(selection => selection),
      options: app.devtools.overlays.options || {}
    };
  }

  function createOverlayWithText(selector, options, appName) {
    const className = `${overlayDivClassName} ${(options.classes || []).join(
      " "
    )}`;
    const element = document.querySelector(selector);
    if (!element) {
      return null;
    }
    const existingOverlayDiv = element.querySelector(`.${overlayDivClassName}`);
    if (existingOverlayDiv) {
      return existingOverlayDiv;
    }
    // setup main overlay div
    let backgroundColor;
    const hexRegex = /^#[A-Fa-f0-9]{6}$/g;
    if (options.color && hexRegex.test(options.color)) {
      backgroundColor = getRGBAFromHex(options.color.replace("#", ""));
    } else if (options.background) {
      backgroundColor = options.background;
    } else {
      backgroundColor = getColorFromString(appName);
    }
    const domStr = `
      <div
        class="${className}"
        style="
          background: ${backgroundColor};
          height: ${options.height || element.clientHeight + "px"};
          left: ${options.left || element.offsetLeft + "px"};
          pointer-events: none;
          position: ${options.position || "absolute"};
          top: ${options.top || element.offsetTop + "px"};
          width: ${options.width || element.clientWidth + "px"};
          z-index: ${options.zIndex || 40};
        "
      >
        <div style="
          align-items: center;
          color: ${options.color ||
            options.textColor ||
            getColorFromString(appName, 1)};
          display: flex;
          flex-direction: ${element.clientHeight > 80 ? "column" : "row"};
          font-size: 32px;
          font-weight: bold;
          height: 100%;
          justify-content: center;
        ">
          <div>${appName}</div>
          ${
            options.textBlocks && options.textBlocks.length >= 1
              ? options.textBlocks.map(textBlock => `<div>${textBlock}</div>`)
              : ""
          }
        </div>
      </div>
    `;
    const overlayEl = new DOMParser().parseFromString(domStr, "text/html").body
      .firstChild;
    return element.appendChild(overlayEl);
  }

  function getColorFromString(string, opacity = 0.4) {
    const raw = (
      parseInt(
        parseInt(string, 36)
          .toExponential()
          .slice(2, -5),
        10
      ) & 0xffffff
    )
      .toString(16)
      .toUpperCase();
    const hex = raw
      .split("")
      .concat([0, 0, 0, 0, 0, 0])
      .slice(0, 6)
      .join("");
    return getRGBAFromHex(hex, opacity);
  }

  function getRGBAFromHex(hex, opacity = 0.1) {
    const [r, g, b] = [
      `0x${hex.slice(0, 2)}`,
      `0x${hex.slice(2, 4)}`,
      `0x${hex.slice(4, 6)}`
    ].map(v => parseInt(v));
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  function getAppByName(appName) {
    const { getRawAppData } = window.__SINGLE_SPA_DEVTOOLS__.exposedMethods;
    return getRawAppData().find(rawApp => rawApp.name === appName);
  }
}
