import L from 'leaflet';

export const RADIUS_OPTIONS_KM = [1, 2, 5, 10, 15] as const;

export const GUJARAT_BOUNDS = {
  minLat: 20.0,
  maxLat: 25.0,
  minLng: 68.0,
  maxLng: 75.0,
};

/**
 * Blue teardrop marker for existing verified CNG stations.
 * Highlights with a glowing mint/cyan ring when inside the active analysis radius.
 */
export const createVerifiedStationMarker = (
  isSelected: boolean = false,
  isNearbyHighlighted: boolean = false
) => {
  const width = isSelected ? 34 : isNearbyHighlighted ? 30 : 26;
  const height = isSelected ? 42 : isNearbyHighlighted ? 38 : 34;
  const gradId = `verifiedBlue_${isSelected ? 'sel' : isNearbyHighlighted ? 'near' : 'std'}`;
  const topColor = isSelected ? '#38BDF8' : isNearbyHighlighted ? '#0EA5E9' : '#2563EB';
  const midColor = isSelected ? '#0284C7' : isNearbyHighlighted ? '#0284C7' : '#1D4ED8';
  const botColor = isSelected ? '#0369A1' : '#1E40AF';

  return L.divIcon({
    className: `cng-verified-station-pin ${isNearbyHighlighted ? 'nearby-highlighted' : ''}`,
    html: `
      <div style="
        position: relative;
        width: ${width}px;
        height: ${height}px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        filter: drop-shadow(0 3px 6px rgba(11, 19, 32, 0.45));
      ">
        ${
          isNearbyHighlighted
            ? '<div style="position:absolute;top:-3px;left:-3px;right:-3px;height:' +
              width +
              'px;border-radius:9999px;border:2.5px solid #5EEAD4;box-shadow:0 0 10px rgba(94,234,212,0.75);"></div>'
            : ''
        }
        <svg width="${width}" height="${height}" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${topColor}" />
              <stop offset="55%" stop-color="${midColor}" />
              <stop offset="100%" stop-color="${botColor}" />
            </linearGradient>
          </defs>
          <path
            d="M15 1C7.268 1 1 7.268 1 15c0 11.2 14 22 14 22s14-10.8 14-22C29 7.268 22.732 1 15 1Z"
            fill="url(#${gradId})"
            stroke="#FFFFFF"
            stroke-width="${isSelected || isNearbyHighlighted ? '2.4' : '1.8'}"
          />
          <circle cx="15" cy="14" r="9.5" fill="#0B1320" fill-opacity="0.28" />
          <rect x="10.5" y="8" width="7" height="11" rx="1.2" fill="#FFFFFF" />
          <rect x="11.8" y="9.5" width="4.4" height="2.4" rx="0.5" fill="${midColor}" />
          <path d="M17.5 10.5h1.2a1 1 0 0 1 1 1v4.5a1 1 0 0 1-2 0V14" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" fill="none" />
          <line x1="9.5" y1="19.5" x2="18.5" y2="19.5" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" />
        </svg>
      </div>
    `,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height],
  });
};

/**
 * Distinct green marker for a newly proposed CNG station.
 */
export const createProposedStationMarker = () => {
  return L.divIcon({
    className: 'cng-proposed-station-pin',
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        filter: drop-shadow(0 5px 10px rgba(5, 150, 105, 0.55));
      ">
        <div style="position:absolute;top:-2px;left:1px;width:34px;height:34px;border-radius:9999px;border:2px solid #5EEAD4;opacity:0.85;"></div>
        <svg width="36" height="44" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="proposedGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#34D399" />
              <stop offset="50%" stop-color="#10B981" />
              <stop offset="100%" stop-color="#047857" />
            </linearGradient>
          </defs>
          <path
            d="M15 1C7.268 1 1 7.268 1 15c0 11.2 14 22 14 22s14-10.8 14-22C29 7.268 22.732 1 15 1Z"
            fill="url(#proposedGreenGrad)"
            stroke="#FFFFFF"
            stroke-width="2.5"
          />
          <circle cx="15" cy="14" r="8.5" fill="#064E3B" fill-opacity="0.35" />
          <path d="M15 9.5v9M10.5 14h9" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" />
        </svg>
      </div>
    `,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });
};
