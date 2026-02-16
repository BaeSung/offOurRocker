import { registerWorksHandlers } from './works'
import { registerChaptersHandlers } from './chapters'
import { registerSeriesHandlers } from './series'
import { registerSettingsHandlers } from './settings'
import { registerSystemHandlers } from './system'
import { registerStatsHandlers } from './stats'
import { registerGoalsHandlers } from './goals'
import { registerSearchHandlers } from './search'
import { registerExportHandlers } from './export'
import { registerAiHandlers } from './ai'
import { registerVersionsHandlers } from './versions'
import { registerTrashHandlers } from './trash'
import { registerCharactersHandlers } from './characters'
import { registerWorldNotesHandlers } from './world-notes'
import { registerDatabaseHandlers } from './database'
import { registerAnalyticsHandlers } from './analytics'
import { registerPlotEventsHandlers } from './plot-events'

export function registerAllIpcHandlers(): void {
  registerWorksHandlers()
  registerChaptersHandlers()
  registerSeriesHandlers()
  registerSettingsHandlers()
  registerSystemHandlers()
  registerStatsHandlers()
  registerGoalsHandlers()
  registerSearchHandlers()
  registerExportHandlers()
  registerAiHandlers()
  registerVersionsHandlers()
  registerTrashHandlers()
  registerCharactersHandlers()
  registerWorldNotesHandlers()
  registerDatabaseHandlers()
  registerAnalyticsHandlers()
  registerPlotEventsHandlers()
}
