'use strict';

const https = require('https');
const colors = require('colors');
const inquirer = require('inquirer');
const Log = require('./Log');

class ZWave {
  static async autocompleteDriver() {
    const zwaveJson = {};
    const settingsJson = [];

    // The z-wavealliance.org API is currently unreliable, ask all properties from the user.
    const { manufacturerId } = await inquirer.prompt([
      {
        type: 'input',
        name: 'manufacturerId',
        message: 'What is the Manufacturer ID (in decimal)?',
      },
    ]);

    if (!manufacturerId) {
      throw new Error('Manufacturer ID is required');
    }

    zwaveJson.manufacturerId = parseInt(manufacturerId, 10);

    const { productTypeId } = await inquirer.prompt([
      {
        type: 'input',
        name: 'productTypeId',
        message: 'What is the Product Type ID (in decimal)? If multiple, separate by comma.',
      },
    ]);

    if (!productTypeId) {
      throw new Error('Product Type ID is required');
    }

    zwaveJson.productTypeId = productTypeId.split(',').map((id) => parseInt(id.trim(), 10));

    const { productId } = await inquirer.prompt([
      {
        type: 'input',
        name: 'productId',
        message: 'What is the Product ID (in decimal)? If multiple, separate by comma.',
      },
    ]);

    if (!productId) {
      throw new Error('Product ID is required');
    }

    zwaveJson.productId = productId.split(',').map((id) => parseInt(id.trim(), 10));

    const { sigmaAllianceProductId } = await inquirer.prompt([
      {
        type: 'input',
        name: 'sigmaAllianceProductId',
        message: 'What is the Z-Wave Alliance Product ID? Leave empty if unknown.',
      },
    ]);

    if (sigmaAllianceProductId) {
      zwaveJson.zwaveAllianceProductId = sigmaAllianceProductId;
    }

    const { sigmaAllianceProductDocumentation } = await inquirer.prompt([
      {
        type: 'input',
        name: 'sigmaAllianceProductDocumentation',
        message: 'What is the Z-Wave Alliance Product Documentation URL? Leave empty if unknown.',
      },
    ]);

    if (sigmaAllianceProductDocumentation) {
      zwaveJson.zwaveAllianceProductDocumentation = sigmaAllianceProductDocumentation;
    }

    const { inclusionDescription } = await inquirer.prompt([
      {
        type: 'input',
        name: 'inclusionDescription',
        message:
          'Enter a short description on how to enable inclusion mode. Leave empty if unknown.',
      },
    ]);

    if (inclusionDescription) {
      zwaveJson.learnmode = {
        instruction: {
          en: inclusionDescription,
        },
      };
    }

    const { exclusionDescription } = await inquirer.prompt([
      {
        type: 'input',
        name: 'exclusionDescription',
        message:
          'Enter a short description on how to enable exclusion mode. Leave empty if unknown.',
      },
    ]);

    if (exclusionDescription) {
      zwaveJson.unlearnmode = {
        instruction: {
          en: exclusionDescription,
        },
      };
    }

    /*
    const { hasSigmaId } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasSigmaId',
        message: `Do you have a Z-Wave Alliance ID? This ID is four digits, found in the URL at ${colors.underline('https://products.z-wavealliance.org/')}`,
      },
    ]);

    if (!hasSigmaId) return;

    const { sigmaId } = await inquirer.prompt([
      {
        type: 'input',
        name: 'sigmaId',
        message: 'What is the Z-Wave Alliance ID?',
      },
    ]);

    if (!sigmaId) return;

    const sigmaJson = await ZWave.getSigmaDetails(sigmaId);

    // set properties
    zwaveJson.manufacturerId = parseInt(sigmaJson.ManufacturerId, 10);
    zwaveJson.productTypeId = [parseInt(sigmaJson.ProductTypeId, 10)];
    zwaveJson.productId = [parseInt(sigmaJson.ProductId, 10)];
    zwaveJson.zwaveAllianceProductId = sigmaJson.Id;
    zwaveJson.zwaveAllianceProductDocumentation = sigmaJson.ManualUrl;

    // inclusion & exclusion
    if (sigmaJson.InclusionDescription) {
      zwaveJson.learnmode = {
        instruction: {
          en: sigmaJson.InclusionDescription,
        },
      };
    }

    if (sigmaJson.ExclusionDescription) {
      zwaveJson.unlearnmode = {
        instruction: {
          en: sigmaJson.ExclusionDescription,
        },
      };
    }

    // get associationGroups and associationGroupsOptions if defined
    if (Array.isArray(sigmaJson.AssociationGroups)) {
      sigmaJson.AssociationGroups.forEach((associationGroup) => {
        let associationGroupNumber;
        try {
          associationGroupNumber = parseInt(associationGroup.GroupNumber, 2);
        } catch (err) {
          return;
        }

        if (Number.isNaN(associationGroupNumber)) return;

        zwaveJson.associationGroups = zwaveJson.associationGroups || [];
        zwaveJson.associationGroups.push(associationGroupNumber);

        if (associationGroup.Description) {
          zwaveJson.associationGroupsOptions = zwaveJson.associationGroupsOptions || {};
          zwaveJson.associationGroupsOptions[associationGroup.GroupNumber] = {
            hint: {
              en: associationGroup.Description,
            },
          };
        }
      });
    }

    // parse settings
    if (Array.isArray(sigmaJson.ConfigurationParameters)) {
      sigmaJson.ConfigurationParameters.forEach((configurationParameter) => {
        const settingObj = {};
        settingObj.id = String(configurationParameter.ParameterNumber);
        settingObj.value = configurationParameter.DefaultValue;
        settingObj.label = {
          en: String(configurationParameter.Name),
        };
        settingObj.hint = {
          en: String(configurationParameter.Description),
        };

        settingObj.zwave = {
          index: configurationParameter.ParameterNumber,
          size: configurationParameter.Size,
        };

        // guess type
        if (configurationParameter.ConfigurationParameterValues
          && Array.isArray(configurationParameter.ConfigurationParameterValues)
          && configurationParameter.ConfigurationParameterValues.length === 2
          && (parseInt(configurationParameter.ConfigurationParameterValues[0].From, 10) === 0
            || parseInt(configurationParameter.ConfigurationParameterValues[0].From, 10) === 1)
          && (parseInt(configurationParameter.ConfigurationParameterValues[0].To, 10) === 0
            || parseInt(configurationParameter.ConfigurationParameterValues[0].To, 10) === 1)
          && (parseInt(configurationParameter.ConfigurationParameterValues[0].From, 10) === 0
            || parseInt(configurationParameter.ConfigurationParameterValues[0].From, 10) === 1)
          && (parseInt(configurationParameter.ConfigurationParameterValues[0].To, 10) === 0
            || parseInt(configurationParameter.ConfigurationParameterValues[0].To, 10) === 1)
        ) {
          settingObj.type = 'checkbox';

          if (settingObj.value === 0) {
            settingObj.value = false;
          } else {
            settingObj.value = true;
          }
        } else if (configurationParameter.ConfigurationParameterValues
          && Array.isArray(configurationParameter.ConfigurationParameterValues)
          && configurationParameter.ConfigurationParameterValues.length >= 3) {
          // Probably dropdown
          const dropdownOptions = [];
          configurationParameter.ConfigurationParameterValues.forEach((setting) => {
            dropdownOptions.push({
              id: setting.From.toString() || setting.To.toString(),
              label: {
                en: setting.Description,
              },
            });
          });
          settingObj.values = dropdownOptions;
          settingObj.type = 'dropdown';
          settingObj.value = settingObj.value.toString();
        } else {
          settingObj.attr = {};

          const configVal = configurationParameter.ConfigurationParameterValues[0];
          if (Object.prototype.hasOwnProperty.call(configVal, 'From')) {
            settingObj.attr.min = parseInt(configVal.From, 10);
          }

          if (Object.prototype.hasOwnProperty.call(configVal, 'To')) {
            settingObj.attr.max = parseInt(configVal.To, 10);
          }

          // Determine if values are signed or not: https://msdn.microsoft.com/en-us/library/s3f49ktz.aspx
          // size is one, and max is larger than 127 -> unsigned
          if ((configurationParameter.Size === 1
              && settingObj.attr.max > 127
              && settingObj.attr.max < 255)
            || (configurationParameter.Size === 2
                && settingObj.attr.max > 32767
                && settingObj.attr.max < 65535)
            || (configurationParameter.Size === 4
                && settingObj.attr.max > 2147483647
                && settingObj.attr.max < 4294967295)) {
            settingObj.signed = false;
          }

          settingObj.type = 'number';
        }

        settingsJson.push(settingObj);
      });
    }
    */

    Log.success(
      `See the developer documentation at ${colors.underline('https://apps.developer.homey.app/wireless/z-wave')} on how to configure associationGroups and device settings.`,
    );

    return { zwave: zwaveJson, settings: settingsJson };
  }

  static async getSigmaDetails(sigmaId) {
    try {
      return await ZWave._fetchJsonWithInsecureTls(
        `https://products.z-wavealliance.org/Products/${sigmaId}/JSON`,
      );
    } catch (err) {
      throw new Error('Invalid Sigma Product ID');
    }
  }

  static async _fetchJsonWithInsecureTls(url) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const settleReject = (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };
      const settleResolve = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const request = https.get(
        url,
        {
          rejectUnauthorized: false,
        },
        (response) => {
          let data = '';

          response.setEncoding('utf8');
          response.on('data', (chunk) => {
            data += chunk;
          });
          response.on('error', (error) => {
            request.destroy(error);
            settleReject(error);
          });
          response.on('aborted', () => {
            const error = new Error('Response aborted');
            request.destroy(error);
            settleReject(error);
          });
          response.on('end', () => {
            if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
              return settleReject(new Error(response.statusMessage || 'Request failed'));
            }

            try {
              return settleResolve(JSON.parse(data));
            } catch (error) {
              return settleReject(error);
            }
          });
        },
      );

      request.on('error', settleReject);
    });
  }
}

module.exports = ZWave;
