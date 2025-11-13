const axios = require('axios');
const express = require('express');
const fs = require('fs');
const fse = require('fs-extra');
const Validator = require('jsonschema').Validator;
const { Engine } = require('json-rules-engine');

const postAlertSchema = {
    'id': '/PostAlertSchema',
    'type': 'object',
    'properties': {
        'errorCode': {
            'type': 'string'
        },
        'additionalParameters': {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {
	                'key': {
                        'type': 'string'
                    },
                    'value': {
                        'type': ['integer', 'number', 'string', 'boolean']
                    }
                },
                'additionalProperties': false,
                'required': ['key', 'value']
            }
        }
    },
    'additionalProperties': false,
    'required': ['errorCode']
};

const conditionRuleSubschema = {
    'id': '/ConditionRuleSubschema',
    'type': 'object',
    'properties': {
        'all': {
            'type': 'array',
            'items': {
                '$ref': '#'
            }
        },
        'any': {
            'type': 'array',
            'items': {
                '$ref': '#'
            }
        },
        'fact': {
            'type': 'string'
        },
        'operator': {
            'type': 'string'
        },
        'value': {
            'type': ['integer', 'boolean']
        }
    },
    'additionalProperties': false,
    'oneOf': [{
        'required': ['all']
    }, {
        'required': ['any']
    }, {
        'required': ['fact', 'operator', 'value']
    }]
};

const postRuleSchema = {
    'id': '/PostRuleSchema',
    'type': 'object',
    'properties': {
        'name': {
            'type': 'string'
        },
        'conditions': {
            'type': 'object',
            'properties': {
                'all': {
                    'type': 'array',
                    'items': {
                        '$ref': '/ConditionRuleSubschema'
                    }
                },
                'any': {
                    'type': 'array',
                    'items': {
                        '$ref': '/ConditionRuleSubschema'
                    }
                }
            },
            'additionalProperties': false,
            'oneOf': [{
                'required': ['all']
            }, {
                'required': ['any']
            }]
        },
        'event': {
            'type': 'object',
            'properties': {
                'type': {
                    'type': 'string'
                },
                'params': {
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string'
                        }
                    },
                    'additionalProperties': false,
                    'required': ['message']
                }
            },
            'additionalProperties': false,
            'required': ['type', 'params']
        }
    },
    'additionalProperties': false,
    'required': ['name', 'conditions', 'event']
};

const putRuleSchema = {
    'id': '/PutRuleSchema',
    'type': 'object',
    'properties': {
        'name': {
            'type': 'string'
        },
        'conditions': {
            'type': 'object',
            'properties': {
                'all': {
                    'type': 'array',
                    'items': {
                        '$ref': '/ConditionRuleSubschema'
                    }
                },
                'any': {
                    'type': 'array',
                    'items': {
                        '$ref': '/ConditionRuleSubschema'
                    }
                }
            },
            'additionalProperties': false,
            'oneOf': [{
                'required': ['all']
            }, {
                'required': ['any']
            }]
        },
        'event': {
            'type': 'object',
            'properties': {
                'type': {
                    'type': 'string'
                },
                'params': {
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string'
                        }
                    },
                    'additionalProperties': false,
                    'required': ['message']
                }
            },
            'additionalProperties': false,
            'required': ['type', 'params']
        }
    },
    'additionalProperties': false,
    'oneOf': [{
        'required': ['name', 'conditions']
    }, {
        'required': ['name', 'event']
    }]
};

var validator = new Validator(), engine = new Engine(), loadFilesOK = false, factsJSON = [], rulesJSON = [], infrastructureElementId = '';
validator.addSchema(conditionRuleSubschema, '/ConditionRuleSubschema');

try {
    var factsFiles = fs.readdirSync('./facts/');
    loadFilesOK = true;
} catch (error) {
    console.error(new Date().toISOString().substring(0, 19) + ' - Error reading facts directory. Starting without facts.');
}

if (loadFilesOK) {
    factsFiles.forEach((factFile) => {
        try {
            let factJSON = JSON.parse(fs.readFileSync('./facts/' + factFile));
            engine.addFact(factJSON.name, factJSON.value);
            factsJSON.push(factJSON);
        } catch (error) {
            console.error(new Date().toISOString().substring(0, 19) + ' - Error reading ' + factFile + '.');
        }
    });

    loadFilesOK = false;
}

try {
    var rulesFiles = fs.readdirSync('./rules/');
    loadFilesOK = true;
} catch (error) {
    console.error(new Date().toISOString().substring(0, 19) + ' - Error reading rules directory. Starting without rules.');
}

if (loadFilesOK) {
    rulesFiles.forEach((ruleFile) => {
        try {
            let ruleJSON = JSON.parse(fs.readFileSync('./rules/' + ruleFile));
            engine.addRule(ruleJSON);
            rulesJSON.push(ruleJSON);
        } catch (error) {
            console.error(new Date().toISOString().substring(0, 19) + ' - Error reading ' + ruleFile + '.');
        }
    });
}

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    next();
});

app.post('/data', async (req, res) => {
    if (req.body === undefined) res.status(400).send();
    else {
        if (infrastructureElementId === '') infrastructureElementId = req.body.id;

        Object.keys(req.body).forEach((key) => {
            if (key !== 'id' && req.body[key] !== 'undefined') {
                let dataFactJSON = {
                    'name': req.body.id + ':' + key,
                    'value': req.body[key]
                };

                let index = factsJSON.findIndex((factJSON) => factJSON.name === dataFactJSON.name);

                if (index !== -1) {
                    engine.removeFact(dataFactJSON.name);
                    factsJSON.splice(index, 1, dataFactJSON);
                } else factsJSON.push(dataFactJSON);

                engine.addFact(dataFactJSON.name, dataFactJSON.value);

                try {
                    fs.writeFileSync('./facts/' + dataFactJSON.name + '.json', JSON.stringify(dataFactJSON));
                } catch (error) {
                    if (index !== -1) console.error(new Date().toISOString().substring(0, 19) + ' - An error occurred while trying to update the fact file ' + dataFactJSON.name + '.json.');
                    else console.error(new Date().toISOString().substring(0, 19) + ' - An error occurred while trying to create the fact file ' + dataFactJSON.name + '.json.');
                }
            }
        });

        if (rulesJSON.length > 0) {
            let ruleName = '', errors = {};

            function inspectKey(key, value) {
                if (key === 'fact' && factsJSON.find((factJSON) => factJSON.name === value) === undefined) errors[ruleName][value] = 'The fact does not exist.';
            }

            function inspectObject(obj, fun) {
                for (let attr in obj) {
                    fun.apply(this, [attr, obj[attr]]);

                    if (obj[attr] !== null && typeof(obj[attr]) === 'object') inspectObject(obj[attr], fun);
                }
            }

            rulesJSON.forEach((ruleJSON) => {
                ruleName = ruleJSON.name;
                errors[ruleName] = {};
                inspectObject(ruleJSON.conditions, inspectKey);

                if (Object.keys(errors[ruleName]).length === 0) delete errors[ruleName];
            });

            if (Object.keys(errors).length === 0) {
                let { results, failureResults, events, failureEvents, almanac } = await engine.run();

                results.forEach((result) => {
                    engine.removeRule(result.name);
                    rulesJSON.splice(rulesJSON.findIndex((ruleJSON) => ruleJSON.name === result.name), 1);

                    try {
                        fs.unlinkSync('./rules/' + result.name + '.json');
                    } catch (error) {
                        console.error(new Date().toISOString().substring(0, 19) + ' - An error occurred while trying to delete the rule file ' + result.name + '.json.');
                    }
                });

                events.forEach((event) => {
                    axios.post('http://' + process.env.AERIOS_EAT_URL + '/async-function/' + event.params.message, {
                        infrastructureElementId: infrastructureElementId
                    }).catch((error) => {
                        console.log(new Date().toISOString().substring(0, 19) + ' - An error occurred while trying to send the alert to the EAT.');
                    });

                    if (process.env.AERIOS_IOTA === 'true') {
                        axios.post('http://' + process.env.AERIOS_IOTA_URL + '/upload?node=' + process.env.AERIOS_IOTA_NODE, {
                            tag: 'self-orchestrator',
                            message: {
                                infrastructureElementId: infrastructureElementId,
                                errorCode: event.params.message
                            }
                        }).catch((error) => {
                            console.log(new Date().toISOString().substring(0, 19) + ' - An error occurred while trying to send the alert to the IOTA tangle.');
                        });
                    }
                });
            } else res.status(400).send(errors);
        }

        res.status(201).send();
    }
});

app.post('/alert', (req, res) => {
    if (req.body === undefined) res.status(400).send('The alert to be forwarded to the EAT has not been received.');
    else {
        if (validator.validate(req.body, postAlertSchema).errors.length === 0) {
            let eatJson = {
                infrastructureElementId: infrastructureElementId
            };

            if ('additionalParameters' in req.body) eatJson.additionalParameters = req.body.additionalParameters;

            axios.post('http://' + process.env.AERIOS_EAT_URL + '/async-function/' + req.body.errorCode, eatJson)
            .catch((error) => {
                console.log(new Date().toISOString().substring(0, 19) + ' - An error occurred while trying to send the alert to the EAT.');
            });

            if (process.env.AERIOS_IOTA === 'true') {
                axios.post('http://' + process.env.AERIOS_IOTA_URL + '/upload?node=' + process.env.AERIOS_IOTA_NODE, {
                    tag: 'self-orchestrator',
                    message: {
                        infrastructureElementId: infrastructureElementId,
                        errorCode: req.body.errorCode
                    }
                }).catch((error) => {
                    console.log(new Date().toISOString().substring(0, 19) + ' - An error occurred while trying to send the alert to the IOTA tangle.');
                });
            }

            res.status(201).send('The alert has been forwarded to the EAT.');
        } else res.status(400).send('The recieved JSON is not a valid alert.');
    }
});

app.get('/rule', (req, res) => {
    if (req.query.name === undefined) res.status(400).send('The name of the rule to be obtained has not been received.');
    else {
        let rule = rulesJSON.find((ruleJSON) => ruleJSON.name === req.query.name);

        if (rule === undefined) res.status(404).send('The rule does not exist.');
        else res.status(200).send(rule);
    }
});

app.get('/rules', (req, res) => {
    res.status(200).send(rulesJSON);
});

app.post('/rules', (req, res) => {
    if (req.body === undefined) res.status(400).send('The rule to be inserted has not been received.');
    else {
        if (validator.validate(req.body, postRuleSchema).errors.length === 0) {
            let index = rulesJSON.findIndex((ruleJSON) => ruleJSON.name === req.body.name);

            if (index !== -1) res.status(422).send('The rule already exists.');
            else {
                engine.addRule(req.body);
                rulesJSON.push(req.body);

                try {
                    fs.writeFileSync('./rules/' + req.body.name + '.json', JSON.stringify(req.body));
                } catch (error) {
                    console.error(new Date().toISOString().substring(0, 19) + ' - An error occurred while trying to create the rule file ' + req.body.name + '.json.');
                }

                res.status(201).send('The rule was successfully created.');
            }
        } else res.status(400).send('The recieved JSON is not a valid rule.');
    }
});

app.put('/rule', (req, res) => {
    if (req.body === undefined) res.status(400).send('The rule to be updated has not been received.');
    else {
        if (validator.validate(req.body, putRuleSchema).errors.length === 0) {
            let rule = rulesJSON.find((ruleJSON) => ruleJSON.name === req.body.name);

            if (rule === undefined) res.status(404).send('The rule does not exist.');
            else {
                if (req.body.hasOwnProperty('conditions')) rule.conditions = req.body.conditions;

                if (req.body.hasOwnProperty('event')) rule.event = req.body.event;

                engine.removeRule(req.body.name);
                engine.addRule(rule);

                try {
                    fs.writeFileSync('./rules/' + req.body.name + '.json', JSON.stringify(rule));
                } catch (error) {
                    console.error(new Date().toISOString().substring(0, 19) + ' - An error occurred while trying to update the rule file ' + req.body.name + '.json.');
                }

                res.status(204).send('The rule was successfully updated.');
            }
        } else res.status(400).send('The recieved JSON is not a valid rule.');
    }
});

app.delete('/rule', (req, res) => {
    if (req.query.name === undefined) res.status(400).send('The name of the rule to be deleted has not been received.');
    else {
        let index = rulesJSON.findIndex((ruleJSON) => ruleJSON.name === req.query.name);

        if (index === -1) res.status(404).send('The rule does not exist.');
        else {
            engine.removeRule(req.query.name);
            rulesJSON.splice(index, 1);

            try {
                fs.unlinkSync('./rules/' + req.query.name + '.json');
            } catch (error) {
                console.error(new Date().toISOString().substring(0, 19) + ' - An error occurred while trying to delete the rule file ' + req.query.name + '.json.');
            }

            res.status(204).send('The rule was successfully deleted.');
        }
    }
});

app.delete('/rules', (req, res) => {
    if (rulesJSON.length === 0) res.status(204).send('There are no rules to delete.');
    else {
        rulesJSON.forEach((ruleJSON) => engine.removeRule(ruleJSON.name));
        rulesJSON = [];

        try {
            fse.emptyDirSync('./rules/');
        } catch (error) {
            console.error(new Date().toISOString().substring(0, 19) + ' - An error occurred while trying to delete all the rule files.');
        }

        res.status(204).send('All the rules were successfully deleted.');
    }
});

try {
    app.listen(8001, () => console.log('Self-orchestrator is running on port 8001.'));
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
