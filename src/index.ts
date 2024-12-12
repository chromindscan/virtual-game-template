import dotenv from "dotenv";
import inquirer from "inquirer";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

async function main() {
  try {
    const templateFiles = await fs.readdir(
      path.join(process.cwd(), "template")
    );
    const jsonTemplates = templateFiles.filter((file) =>
      file.endsWith(".json")
    );

    if (jsonTemplates.length === 0) {
      console.error("No JSON templates found in template/ directory");
      process.exit(1);
    }

    const { selectedTemplate } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedTemplate",
        message: "Which template would you like to use?",
        choices: jsonTemplates,
      },
    ]);

    let templateContent = await fs.readFile(
      path.join(process.cwd(), "template", selectedTemplate),
      "utf-8"
    );

    templateContent = templateContent.replace(/<UUID>/g, uuidv4());
    const templateContentJson = JSON.parse(templateContent);
    const cliConfig = templateContentJson.cli;

    delete templateContentJson.cli;
    templateContent = JSON.stringify(templateContentJson, null, 2);
    for (const env of cliConfig.required_env) {
      let envName = process.env[env];
      if (!envName) {
        const prompt = await inquirer.prompt([
          {
            type: "password",
          name: "envName",
          message: `Enter the value for ${env}:`,
        },
      ]);
      envName = prompt.envName;
    }

      templateContent = templateContent.replace(
        new RegExp(`<${env}>`, "g"),
        envName!
      );
    }

    const outputFilename = `${
      path.parse(selectedTemplate).name
    }-${Date.now()}.json`;

    await fs.mkdir(path.join(process.cwd(), "generated"), { recursive: true });

    await fs.writeFile(
      path.join(process.cwd(), "generated", outputFilename),
      templateContent
    );

    console.log(`Successfully generated: generated/${outputFilename}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
