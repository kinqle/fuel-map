"use client";
import L from "leaflet";
import type { MarkerStatus } from "./types";
import { STATUS_COLORS } from "./constants";

let _iconSeq = 0;

export function createStationIcon(
  short:      string,
  status:     MarkerStatus,
  selected:   boolean,
  recommended: boolean,
  hovered    = false,
  fuelColors: [string, string, string] = ["#6b7280", "#6b7280", "#6b7280"],
  pinColor   = "",
): L.DivIcon {
  const uid = ++_iconSeq;
  const [c0, c1, c2] = fuelColors;
  const bg = pinColor || STATUS_COLORS[status].bg;

  const sz   = selected ? 58 : recommended ? 54 : hovered ? 52 : 48;
  const cx   = sz / 2;
  const cy   = sz / 2;

  const ringR  = cx - 5;
  const ringW  = 6;
  const innerR = ringR - ringW / 2 - 2;
  const C      = 2 * Math.PI * ringR;
  const seg    = C / 3;
  const vis    = seg - 3.5;
  const dashGap = C - vis;
  const off1   = -seg;
  const off2   = -seg * 2;

  const tailH  = 12;
  const totalH = sz + tailH;
  const fs     = Math.round(innerR * 1.1);

  const glowColor = [c0, c1, c2].includes("#22c55e") ? "#22c55e"
    : [c0, c1, c2].includes("#f59e0b") ? "#f59e0b"
    : [c0, c1, c2].includes("#ef4444") ? "#ef4444"
    : bg;

  const cls = [
    "fm-pin",
    selected    ? "fm-pin--selected"    : "",
    recommended ? "fm-pin--recommended" : "",
  ].filter(Boolean).join(" ");

  const html = `
    <div class="${cls}" style="--pc:${glowColor};--glow:0,0,0;">
      <svg width="${sz}" height="${totalH}" viewBox="0 0 ${sz} ${totalH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="ps${uid}" x="-40%" y="-20%" width="180%" height="180%">
            <feDropShadow dx="0" dy="${selected ? 6 : 3}" stdDeviation="${selected ? 6 : 3}"
                          flood-color="rgba(0,0,0,${selected ? 0.55 : 0.4})"/>
          </filter>
        </defs>
        <polygon points="${cx - 7},${sz - 5} ${cx + 7},${sz - 5} ${cx},${totalH}"
                 fill="${bg}" filter="url(#ps${uid})"/>
        <circle cx="${cx}" cy="${cy}" r="${cx - 2}" fill="rgba(12,12,18,0.90)" filter="url(#ps${uid})"/>
        <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none"
                stroke="${c0}" stroke-width="${ringW}"
                stroke-dasharray="${vis.toFixed(1)} ${dashGap.toFixed(1)}"
                stroke-dashoffset="0"
                transform="rotate(-90 ${cx} ${cy})"/>
        <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none"
                stroke="${c1}" stroke-width="${ringW}"
                stroke-dasharray="${vis.toFixed(1)} ${dashGap.toFixed(1)}"
                stroke-dashoffset="${off1.toFixed(1)}"
                transform="rotate(-90 ${cx} ${cy})"/>
        <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none"
                stroke="${c2}" stroke-width="${ringW}"
                stroke-dasharray="${vis.toFixed(1)} ${dashGap.toFixed(1)}"
                stroke-dashoffset="${off2.toFixed(1)}"
                transform="rotate(-90 ${cx} ${cy})"/>
        <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${bg}"/>
        <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="rgba(255,255,255,0.10)"/>
        <text x="${cx}" y="${cy}"
              text-anchor="middle" dominant-baseline="central"
              font-size="${fs}" font-weight="800"
              font-family="system-ui,-apple-system,sans-serif"
              fill="white" opacity="0.95">${short}</text>
        ${recommended ? `<text x="${cx}" y="${cy - innerR - 6}" text-anchor="middle" font-size="10" fill="#fbbf24">★</text>` : ""}
      </svg>
    </div>`;

  return L.divIcon({ className: "", html, iconSize: [sz, totalH], iconAnchor: [cx, totalH] });
}

export function createClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  const sz = count > 9 ? 58 : 50;
  return L.divIcon({
    className: "",
    html: `
      <div class="fm-cluster" style="--cl-sz:${sz}px;">
        <div class="fm-cluster__ring"></div>
        <div class="fm-cluster__body">
          <span class="fm-cluster__count">${count}</span>
        </div>
      </div>`,
    iconSize:   [sz, sz],
    iconAnchor: [sz / 2, sz / 2],
  });
}

export function createUserIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:24px;height:24px;">
      <div class="fm-pulse" style="position:absolute;inset:0;background:rgba(59,130,246,0.28);border-radius:50%;"></div>
      <div style="position:absolute;inset:4px;background:#3b82f6;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 10px rgba(59,130,246,0.55);"></div>
    </div>`,
    iconSize:   [24, 24],
    iconAnchor: [12, 12],
  });
}
