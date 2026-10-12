import { Fragment, useEffect } from 'react'
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngBoundsExpression } from 'leaflet'

export interface MapPoint { id?: number; name: string; latitude: number; longitude: number; radius_meters: number; is_active?: boolean }

const CAIRO: [number, number] = [30.0444, 31.2357]

function FitTo({ points, focus }: { points: MapPoint[]; focus?: MapPoint | null }) {
  const map = useMap()
  const key = focus ? `${focus.latitude},${focus.longitude}` : points.map((p) => p.id).join(',')
  useEffect(() => {
    if (focus) {
      map.setView([focus.latitude, focus.longitude], Math.max(map.getZoom(), 16))
    } else if (points.length) {
      const bounds: LatLngBoundsExpression = points.map((p) => [p.latitude, p.longitude])
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return null
}

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

/** Shows locations as circles of their check-in radius. With `onPick`, clicking the map picks a point. */
export function LocationMap({ points, editing, onPick, height = 380 }: {
  points: MapPoint[]
  editing?: MapPoint | null
  onPick?: (lat: number, lng: number) => void
  height?: number
}) {
  const others = editing ? points.filter((p) => p.id !== editing.id) : points
  return (
    <div className="map" style={{ height }}>
      <MapContainer center={CAIRO} zoom={11} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {others.map((p) => {
          const color = p.is_active === false ? '#9a8f82' : '#9E7E45'
          return (
            <Fragment key={p.id ?? p.name}>
              <Circle center={[p.latitude, p.longitude]} radius={p.radius_meters} pathOptions={{ color, weight: 2, fillOpacity: editing ? 0.08 : 0.2 }} />
              {/* Fixed-size dot so the location stays visible when zoomed out. */}
              <CircleMarker center={[p.latitude, p.longitude]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }}>
                <Tooltip permanent={!editing} direction="top" offset={[0, -6]}>{p.name} · {p.radius_meters} m</Tooltip>
              </CircleMarker>
            </Fragment>
          )
        })}
        {editing && Number.isFinite(editing.latitude) && Number.isFinite(editing.longitude) && (
          <>
            <Circle center={[editing.latitude, editing.longitude]} radius={editing.radius_meters} pathOptions={{ color: '#6B3410', weight: 2, fillColor: '#C9A96E', fillOpacity: 0.3 }} />
            <CircleMarker center={[editing.latitude, editing.longitude]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: '#6B3410', fillOpacity: 1 }} />
          </>
        )}
        {onPick && <ClickToPick onPick={onPick} />}
        <FitTo points={others} focus={editing && Number.isFinite(editing.latitude) ? editing : null} />
      </MapContainer>
    </div>
  )
}
