export const BASE_PATH = import.meta.env.BASE_URL;
export const SAVE_KEY = BASE_PATH === "/" ? "endless.save.v1" : "endless.dev.save.v1";
export const CODE_KEY = BASE_PATH === "/" ? "endless.cloud.code" : "endless.dev.cloud.code";
