// @flow

export type RestState<T> = {
  data: T,
  error?: any,
  processing: boolean,
  loaded: boolean,
  fetchStatus?: string,
};

export type Endpoint = {
  name: string,
  getUrl?: string|(...args: any) => string,
  postUrl?: string|(...args: any) => string,
  patchUrl?: string|(...args: any) => string,
  getOptions?: (...args: any) => Object,
  postOptions?: (...args: any) => Object,
  patchOptions?: (...args: any) => Object,
  extraActions?: Object,
  getPrefix?: string,
  postPrefix?: string,
  patchPrefix?: string,
  getFunc?: Function,
  postFunc?: Function,
  patchFunc?: Function,
  verbs: Array<string>,
};
