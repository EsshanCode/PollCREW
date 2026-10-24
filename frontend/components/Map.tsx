"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Jurisdiction } from "./types";
export default function Map({
  data,
  selected,
  onSelect,
}: {
  data: Jurisdiction[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { scrollWheelZoom: false }).setView(
      [38.8, -97],
      4,
    );
    map.attributionControl.addAttribution("US Census Bureau · us-atlas");
    let active = true;
    fetch("/us-states.geojson")
      .then((response) => response.json())
      .then((states) => {
        if (active)
          L.geoJSON(states, {
            style: {
              color: "#b6c8c1",
              weight: 1,
              fillColor: "#edf2e9",
              fillOpacity: selected ? 0 : 1,
            },
            interactive: false,
          })
            .addTo(map)
            .bringToBack();
      })
      .catch(() => {});
    if (selected) {
      const d = data.find((d) => d.jurisdiction.id === selected)!;
      map.setView([d.jurisdiction.lat, d.jurisdiction.lon], 11);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);
      d.locations.forEach((loc) => {
        const count =
          d.plan?.assignments.filter((a) => a.location_id === loc.id).length ??
          0;
        const need = loc.requirements.reduce((sum, r) => sum + r.desired, 0);
        const color = !d.plan
          ? "#668398"
          : count < need
            ? "#ce7826"
            : "#087f75";
        const marker = L.circleMarker([loc.lat, loc.lon], {
          radius: 12,
          color: "#fff",
          weight: 3,
          fillColor: color,
          fillOpacity: 1,
        }).addTo(map);
        const label = document.createElement("div");
        label.textContent = `${loc.name} · ${count}/${need} assigned · ${loc.precincts.length} precincts`;
        marker.bindTooltip(label, { direction: "top" });
      });
    } else {
      data.forEach((d) => {
        const marker = L.circleMarker(
          [d.jurisdiction.lat, d.jurisdiction.lon],
          {
            radius: 13,
            color: "#fff",
            weight: 3,
            fillColor: "#087f75",
            fillOpacity: 1,
          },
        ).addTo(map);
        marker.on("click", () => onSelect(d.jurisdiction.id));
        const label = document.createElement("div");
        label.textContent = `${d.jurisdiction.name}, ${d.jurisdiction.code} · synthetic demo`;
        marker.bindTooltip(label, {
          permanent: true,
          direction: "top",
          offset: [0, -12],
        });
      });
    }
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(ref.current);
    return () => {
      active = false;
      observer.disconnect();
      map.remove();
    };
  }, [data, selected, onSelect]);
  return (
    <div
      ref={ref}
      className="map"
      aria-label={
        selected
          ? "Synthetic voting locations map; location details are listed below"
          : "United States demo jurisdiction map; use the jurisdiction cards to select"
      }
    />
  );
}
