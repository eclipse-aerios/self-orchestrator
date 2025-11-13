# Self-orchestrator

The aeriOS self-orchestrator module is one of the 4 essential modules within the aeriOS self-* capabilities set. Composed by a rules engine, a facts generator, a trigger and wrapped by an API, it is capable of managing facts, rules and alerts, obtaining information from the self-awareness, self-realtimeness, self-healing and self-optimisation and adaptation modules to send warnings about problems in the IE to the aeriOS EAT, with the goal to improve the management and coordination of their own workloads. This improves the scalability of tasks and reduces the number of errors that occur during task execution.

## Relationships with another self-* capabilities

The following figure describe the self-orchestrator module inside the IE and the relationships with another self-* modules.

<figure>
  <img src="self_capabilities_relationships.png" alt="Self-* capabilities relationships"/>
  <figcaption><b>Figure 1. Self-* capabilities relationships</b></figcaption>
</figure>

## Getting started

> ⚠️**Warning** \
>  Remember to manually create *facts* and *rules* folders if you run the image in Docker. In Kubernetes they are created automatically:
>  - *facts*: */etc/aerios/self-orchestrator/facts*
>  - *rules*: */etc/aerios/self-orchestrator/rules*

## Environment variables

- AERIOS_EAT_URL: the URL where EAT is running.
  - Value: IP and port.
- AERIOS_IOTA: indicates whether IOTA is enabled in the domain or not.
  - Value: true/false.
- AERIOS_IOTA_URL: the URL where IOTA is running.
  - Value: IP and port.
  - *Optional (if AERIOS_IOTA is false)*.
- AERIOS_IOTA_NODE: IOTA node to send the message to.
  - Value: IOTA node name.
  - *Optional (if AERIOS_IOTA is false)*.

## Local deployment

To test the code locally:

1) Download [package.json](./package.json) and [script.js](./script.js) files in the same folder.

2) In the same directory where the files were downloaded, run the following command to create two folders called *facts* and *rules*:

```bash
mkdir facts rules
```

3) In the same directory where the files were downloaded, run the following command to install the necessary dependencies:

```bash
npm install
```

4) In the same directory where the files were downloaded, run the following command to launch the self-orchestrator:

```bash
node script.js
```

## API

A [swagger.yaml](./swagger.yaml) file is available for consultation.
