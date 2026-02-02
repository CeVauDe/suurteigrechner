# Diagrams

This folder contains PlantUML diagrams for documenting the application architecture.

## Generating Diagrams

To generate SVG output from PlantUML files, run e.g. the following command from the project root:

```bash
docker run --rm -v $(pwd):/data plantuml/plantuml -tsvg /data/docs/diagrams/notifications-activity.puml
```

This will create `notifications-activity.svg` in the same directory.

### Options

- `-tsvg` – Output as SVG (default is PNG)
- `-tpng` – Output as PNG
- `-o /data/docs/diagrams/output` – Specify output directory

### Generate All Diagrams

To generate all diagrams in the folder:

```bash
docker run --rm -v $(pwd):/data plantuml/plantuml -tsvg "/data/docs/diagrams/*.puml"
```
