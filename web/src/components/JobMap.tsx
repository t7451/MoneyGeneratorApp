import { useEffect, useRef, useState } from 'react';
import { Job } from '../data/mockJobs';
import jobMapStyle from './jobMapStyle.json';
import './JobMap.css';

type MapLibreMap = import('maplibre-gl').Map;
type MapLibreGeoJSONSource = import('maplibre-gl').GeoJSONSource;
type MapLibreModule = typeof import('maplibre-gl/dist/maplibre-gl-csp');
type MapLibreStyleSpecification = import('maplibre-gl').StyleSpecification;
type JobMapLayerClickEvent = import('maplibre-gl').MapMouseEvent & {
  features?: import('maplibre-gl').MapGeoJSONFeature[];
};

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
  const mapRef = useRef<MapLibreMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldInitializeMap, setShouldInitializeMap] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || shouldInitializeMap) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setShouldInitializeMap(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldInitializeMap(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px 0px',
        threshold: 0.1,
      },
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [shouldInitializeMap]);

  useEffect(() => {
    if (!shouldInitializeMap || mapRef.current || !containerRef.current) return;

    let disposed = false;
    let activeMap: MapLibreMap | null = null;

    const initializeMap = async () => {
      const [maplibreModule, workerUrlModule] = await Promise.all([
        import('maplibre-gl/dist/maplibre-gl-csp') as Promise<MapLibreModule>,
        import('maplibre-gl/dist/maplibre-gl-csp-worker.js?url'),
      ]);

      if (disposed || !containerRef.current) {
        return;
      }

      maplibreModule.setWorkerUrl(workerUrlModule.default);
      const maplibregl = maplibreModule.default;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: jobMapStyle as MapLibreStyleSpecification,
        center,
        zoom: 11,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      map.on('load', () => {
        setIsMapReady(true);

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
        map.on('click', 'clusters', (event: JobMapLayerClickEvent) => {
          const features = map.queryRenderedFeatures(event.point, { layers: ['clusters'] });
          const clusterId = features[0].properties['cluster_id'];

          void (async () => {
            try {
              const zoom = await (map.getSource('jobs') as MapLibreGeoJSONSource).getClusterExpansionZoom(clusterId);
              map.easeTo({
                center: (features[0].geometry as any).coordinates,
                zoom,
              });
            } catch (err) {
              console.error('Error getting cluster zoom:', err);
            }
          })();
        });

        // Handle click on individual job marker
        map.on('click', 'unclustered-point', (event: JobMapLayerClickEvent) => {
          const pointGeometry = event.features![0].geometry as GeoJSON.Point;
          const coordinates: [number, number] = [
            Number(pointGeometry.coordinates[0]),
            Number(pointGeometry.coordinates[1]),
          ];
          const { title, company, pay } = event.features![0].properties;

          // Ensure popup appears over the copy being pointed to
          while (Math.abs(event.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += event.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          new maplibregl.Popup()
            .setLngLat(coordinates as [number, number])
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
      activeMap = map;
    };

    initializeMap().catch((err) => {
      console.error('Failed to initialize job map:', err);
    });

    return () => {
      disposed = true;
      activeMap?.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, [center, jobs, shouldInitializeMap]);

  // Reactive updates for jobs data
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    // Check if style is loaded before updating source
    if (map.isStyleLoaded()) {
      const source = map.getSource('jobs') as MapLibreGeoJSONSource;
      if (source) {
        source.setData(buildGeoJson(jobs));
      }
    } else {
      map.once('load', () => {
        const source = map.getSource('jobs') as MapLibreGeoJSONSource;
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

  return (
    <div ref={containerRef} className={`job-map-container${isMapReady ? '' : ' job-map-container--pending'}`}>
      {!isMapReady && (
        <div className="job-map-placeholder" role="status" aria-live="polite">
          <div className="job-map-placeholder__spinner" aria-hidden="true" />
          <p>{shouldInitializeMap ? 'Loading interactive map...' : 'Map loads when this section enters view.'}</p>
        </div>
      )}
    </div>
  );
}
