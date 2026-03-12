import { useEffect, useRef } from 'react';
import maplibregl, { Map, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Job } from '../data/mockJobs';

interface JobMapProps {
  jobs: Job[];
  center?: [number, number];
}

function buildGeoJson(jobs: Job[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: jobs
      .filter((job) => typeof job.longitude === 'number' && typeof job.latitude === 'number')
      .map((job) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [job.longitude!, job.latitude!],
        },
        properties: {
          id: job.id,
          title: job.title,
          pay: `${job.pay.amount}/${job.pay.unit}`,
          company: job.company,
        },
      })),
  };
}

export function JobMap({ jobs, center = [-122.4194, 37.7749] }: JobMapProps) {
  const mapRef = useRef<Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center,
      zoom: 10,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      map.addSource('jobs', {
        type: 'geojson',
        data: buildGeoJson(jobs),
        cluster: true,
        clusterRadius: 40,
        clusterMaxZoom: 14,
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'jobs',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#667eea',
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            16,
            10, 20,
            25, 26,
            50, 32,
          ],
          'circle-opacity': 0.8,
        },
      });

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'jobs',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'jobs',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#10b981',
          'circle-radius': 8,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['clusters'],
        });
        const clusterId = features[0]?.properties?.cluster_id;
        const source = map.getSource('jobs') as GeoJSONSource;
        if (!clusterId || !source) return;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          map.easeTo({ center: (features[0].geometry as any).coordinates as [number, number], zoom });
        });
      });

      map.on('click', 'unclustered-point', (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const { title, company, pay } = feature.properties as Record<string, string>;
        const coordinates = (feature.geometry as any).coordinates.slice();
        new maplibregl.Popup({ closeOnMove: true })
          .setLngLat(coordinates)
          .setHTML(`<strong>${title}</strong><br/>${company}<br/>${pay}`)
          .addTo(map);
      });

      map.on('mouseenter', 'clusters', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'clusters', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, jobs]);

  // Update data when jobs change
  useEffect(() => {
    const source = mapRef.current?.getSource('jobs') as GeoJSONSource | undefined;
    if (source) {
      source.setData(buildGeoJson(jobs));
    }
  }, [jobs]);

  return <div ref={containerRef} style={{ height: '420px', width: '100%', borderRadius: '12px', overflow: 'hidden' }} />;
}
