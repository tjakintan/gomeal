/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/boot`; params?: Router.UnknownInputParams; } | { pathname: `/bug`; params?: Router.UnknownInputParams; } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/open`; params?: Router.UnknownInputParams; } | { pathname: `/overlay`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `/share/[id]`, params: Router.UnknownInputParams & { id: string | number; } };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/boot`; params?: Router.UnknownOutputParams; } | { pathname: `/bug`; params?: Router.UnknownOutputParams; } | { pathname: `/`; params?: Router.UnknownOutputParams; } | { pathname: `/open`; params?: Router.UnknownOutputParams; } | { pathname: `/overlay`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; } | { pathname: `/share/[id]`, params: Router.UnknownOutputParams & { id: string; } };
      href: Router.RelativePathString | Router.ExternalPathString | `/boot${`?${string}` | `#${string}` | ''}` | `/bug${`?${string}` | `#${string}` | ''}` | `/${`?${string}` | `#${string}` | ''}` | `/open${`?${string}` | `#${string}` | ''}` | `/overlay${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/boot`; params?: Router.UnknownInputParams; } | { pathname: `/bug`; params?: Router.UnknownInputParams; } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/open`; params?: Router.UnknownInputParams; } | { pathname: `/overlay`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | `/share/${Router.SingleRoutePart<T>}${`?${string}` | `#${string}` | ''}` | { pathname: `/share/[id]`, params: Router.UnknownInputParams & { id: string | number; } };
    }
  }
}
