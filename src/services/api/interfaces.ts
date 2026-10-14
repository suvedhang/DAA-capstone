/**
 * Service interfaces for a future backend.
 *
 * The frontend depends only on these contracts. Today they are fulfilled by
 * local adapters; tomorrow a Node/Express + Supabase implementation can be
 * dropped in without changing UI or algorithm code.
 */
import type {
  DatasetManifest,
  FeatureCollection,
  LayerKey,
  NetworkGraph,
} from "../../types";

export interface WaterNetworkService {
  getManifest(): Promise<DatasetManifest>;
  getLayer(key: LayerKey): Promise<FeatureCollection>;
  getGraph(): Promise<NetworkGraph>;
}

export interface ScenarioRecord<TPayload = unknown> {
  id: string;
  name: string;
  module: "allocation" | "recovery" | "conservation" | "network";
  createdAt: string;
  updatedAt: string;
  payload: TPayload;
}

export interface ScenarioService {
  list(): Promise<ScenarioRecord[]>;
  save(record: ScenarioRecord): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}
