// @ts-ignore
import { Map, Set } from 'immutable'

import * as conversion from './conversion'
import * as filter from './filter'
import * as flatten from './flatten'
import * as functions from './functions'
import * as group from './group'
import * as leftJoin from './leftJoin'
import * as map from './map'
import * as union from './union'
import * as zip from './zip'

export * from './conversion'
export * from './filter'
export * from './flatten'
export * from './functions'
export * from './group'
export * from './leftJoin'
export * from './map'
export * from './union'
export * from './zip'

export const EvImmInternals = {
  ...conversion,
  ...filter,
  ...flatten,
  ...functions,
  ...group,
  ...leftJoin,
  ...map,
  ...union,
  ...zip,
}

export * from './chain'