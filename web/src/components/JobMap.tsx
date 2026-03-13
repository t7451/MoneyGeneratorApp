import { useEffect, useRef } from 'react';
import maplibregl, { Map, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Job } from '../data/mockJobs';
import './JobMap.css';

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
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [job.longitude!, job.latitude!],
        },
        properties: {
          id: job.id,
          title: job.title,
          pay: `$${job.pay.amount}/${job.pay.unit}`,
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
      zoom: 11,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      // Add data source
      map.addSource('jobs', {
        type: 'geojson',
        data: buildGeoJson(jobs),
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 14,
      });

      // Clusters Layer
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'jobs',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6',
            20,
            '#f1f075',
            50,
            '#f28cb1'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            20,
            30,
            50,
            40
          ]
        }
      });

      // Cluster Count Text
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'jobs',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        }
      });

      // Unclustered Points (Single Jobs)
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'jobs',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#10b981',
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        }
      });

      // Handle click on cluster to zoom in
      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0].properties['cluster_id'];
        
        (map.getSource('jobs') as GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !zoom) return;
          map.easeTo({
            center: (features[0].geometry as any).coordinates,
            zoom: zoom
          });
        });
      });

      // Handle click on individual job marker
      map.on('click', 'unclustered-point', (e) => {
        const coordinates = (e.features![0].geometry as any).coordinates.slice();
        const { title, company, pay } = e.features![0].properties;

        // Ensure popup appears over the copy being pointed to
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new maplibregl.Popup()
          .setLngLat(coordinates)
          .setHTML(
            `<div class="map-popup-content">
              <div class="map-popup-title">${title}</div>
              <div class="map-popup-company">${company}</div>
              <div class="map-popup-wage">${pay}</div>
            </div>`
          )
          .addTo(map);
      });

      // Change cursor on hover
      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = ''; });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // Initialize strictly once

  // Reactive updates for jobs data
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    // Check if style is loaded before updating source
    if (map.isStyleLoaded()) {
      const source = map.getSource('jobs') as GeoJSONSource;
      if (source) {
        source.setData(buildGeoJson(jobs));
      }
    } else {
      map.once('load', () => {
        const source = map.getSource('jobs') as GeoJSONSource;
        if (source) {
          source.setData(buildGeoJson(jobs));
        }
      });
    }
  }, [jobs]);

  // Reactive updates for center position
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    map.flyTo({
      center,
      zoom: 12,
      essential: true
    });
  }, [center]);

  return <div ref={containerRef} className="job-map-container" />;
}
