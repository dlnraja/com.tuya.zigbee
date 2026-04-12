import { logJsonError, printStructuredOutput } from '../../../lib/CliOutput.mjs';
import Log from '../../../lib/Log.js';
import {
  applyHomeyIdOption,
  applyJqOutputOption,
  applyJsonOutputOption,
} from '../../../lib/api/ApiCommandOptions.mjs';
import { diagnoseHomeyStrategies } from '../../../lib/api/ApiCommandRuntime.mjs';

export const command = 'diagnose';
export const desc = 'Diagnose Homey discovery strategy connectivity';

function formatStrategyList(strategyIds) {
  return strategyIds.length > 0 ? strategyIds.join(', ') : '-';
}

function printHumanReport(report) {
  Log(`Homey: ${report.target.name} (${report.target.id})`);
  Log(`Platform: ${report.target.platform}`);

  if (report.target.model) {
    Log(`Model: ${report.target.model}`);
  }

  Log(`Preferred strategies: ${formatStrategyList(report.preferredStrategyIds)}`);
  Log(`Attempted strategies: ${formatStrategyList(report.attemptedStrategyIds)}`);
  Log('');

  report.results.forEach((result) => {
    if (result.available) {
      Log.success(
        `${result.strategyId} (${result.durationMs}ms)${result.baseUrl ? ` ${result.baseUrl}` : ''}`,
      );
      return;
    }

    if (result.status === 'not-configured') {
      Log.warning(`${result.strategyId} (${result.durationMs}ms) ${result.error}`);
      return;
    }

    Log.error(`${result.strategyId} (${result.durationMs}ms) ${result.error}`);
  });

  Log('');

  if (report.selectedStrategyId) {
    Log(`Selected strategy: ${report.selectedStrategyId}`);

    if (report.selectedBaseUrl) {
      Log(`Selected base URL: ${report.selectedBaseUrl}`);
    }
  } else {
    Log.warning('No discovery strategy succeeded.');
  }
}

export const builder = (yargs) => {
  return applyHomeyIdOption(applyJqOutputOption(applyJsonOutputOption(yargs)))
    .example('$0 api diagnose', 'Diagnose discovery strategies for the selected Homey')
    .example(
      '$0 api diagnose --homey-id <id> --json',
      'Diagnose discovery strategies for a cached Homey and print JSON output',
    )
    .help();
};

export const handler = async (argv = {}) => {
  try {
    const report = await diagnoseHomeyStrategies({
      homeyId: argv.homeyId,
    });

    printStructuredOutput({
      value: report,
      argv,
      printHuman: () => printHumanReport(report),
    });

    process.exit(report.availableStrategyIds.length > 0 ? 0 : 1);
  } catch (err) {
    logJsonError(err, argv);
    process.exit(1);
  }
};
