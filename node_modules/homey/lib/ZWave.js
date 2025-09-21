'use strict';

const https = require('https');
const colors = require('colors');
const inquirer = require('inquirer');
const fetch = require('node-fetch');

class ZWave {

  static async autocompleteDriver() {
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

    const zwaveJson = {};
    const settingsJson = [];

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
      sigmaJson.AssociationGroups.forEach(associationGroup => {
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
      sigmaJson.ConfigurationParameters.forEach(configurationParameter => {
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
          configurationParameter.ConfigurationParameterValues.forEach(setting => {
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

    return { zwave: zwaveJson, settings: settingsJson };
  }

  static async getSigmaDetails(sigmaId) {
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });

    try {
      const response = await fetch(`https://products.z-wavealliance.org/Products/${sigmaId}/JSON`, { agent });
      if (!response.ok) throw new Error(response.statusText);
      const json = await response.json();
      return json;
    } catch (err) {
      throw new Error('Invalid Sigma Product ID');
    }
  }

}

module.exports = ZWave;
