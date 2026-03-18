import {
  formatSuiteSummary,
  listPlannerFixtureNames,
  listScenarioNames,
  runPlannerFixtureByName,
  runPlannerFixtureSuite,
  runScenarioByName,
  runScenarioSuite,
} from '../src/services/assistant/testing/harness';
import { localCommandPlanner } from '../src/services/assistant/localPlanner';

const printUsage = (): void => {
  console.log(`Usage:
  npm run assistant:cli -- list
  npm run assistant:cli -- suite
  npm run assistant:cli -- run <scenario-name>
  npm run assistant:cli -- plan "<user request>"
  npm run assistant:cli -- plan-suite
  npm run assistant:cli -- plan-fixture <fixture-name>`);
};

const main = async (): Promise<void> => {
  const [, , command, ...rest] = process.argv;

  switch (command) {
    case 'list': {
      console.log('Scenarios:');
      listScenarioNames().forEach((name) => console.log(`- ${name}`));
      console.log('\nPlanner fixtures:');
      listPlannerFixtureNames().forEach((name) => console.log(`- ${name}`));
      return;
    }

    case 'suite': {
      const scenarioSummaries = await runScenarioSuite();
      const plannerSummaries = runPlannerFixtureSuite();
      console.log('Scenario suite');
      scenarioSummaries.forEach((item) => console.log(`- ${item.name}: ${item.status}`));
      console.log(formatSuiteSummary(scenarioSummaries));
      console.log('\nPlanner suite');
      plannerSummaries.forEach((item) => console.log(`- ${item.name}: ${item.status}`));
      console.log(formatSuiteSummary(plannerSummaries));
      return;
    }

    case 'run': {
      const scenarioName = rest[0];
      if (!scenarioName) {
        throw new Error('Missing scenario name.');
      }

      const summary = await runScenarioByName(scenarioName);
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    case 'plan': {
      const input = rest.join(' ').trim();
      if (!input) {
        throw new Error('Missing planner input.');
      }

      const plan = localCommandPlanner.buildPlan(input);
      console.log(JSON.stringify(plan, null, 2));
      return;
    }

    case 'plan-suite': {
      const plannerSummaries = runPlannerFixtureSuite();
      plannerSummaries.forEach((item) => console.log(`- ${item.name}: ${item.status}`));
      console.log(formatSuiteSummary(plannerSummaries));
      return;
    }

    case 'plan-fixture': {
      const fixtureName = rest[0];
      if (!fixtureName) {
        throw new Error('Missing planner fixture name.');
      }

      const summary = runPlannerFixtureByName(fixtureName);
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    default:
      printUsage();
  }
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
