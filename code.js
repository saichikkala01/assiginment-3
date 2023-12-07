console.log("Starting");

function visualizeGraph(data, svgContainer) {
  const graphWidth = parseInt(svgContainer.attr("viewBox").split(" ")[2]);
  const graphHeight = parseInt(svgContainer.attr("viewBox").split(" ")[3]);
  const mainGroup = svgContainer
    .append("g")
    .attr("transform", "translate(0, 50)");

  let nodeSizeMetric = "publications"; // Default node size metric

  function updateNodeSize(metric) {
    nodeSizeMetric = metric;
    updateNodeRadius();
  }

  d3.selectAll('input[name="nodeSizeMetric"]').on("change", function () {
    updateNodeSize(this.value);
  });

  function updateNodeRadius() {
    nodeElements.selectAll("circle").attr("r", function (nodeData) {
      let radius;
      if (nodeSizeMetric === "publications") {
        radius = calculateRadius(nodeData.Authors.length);
      } else if (nodeSizeMetric === "degree") {
        radius = calculateRadius(nodeDegree[nodeData.id]);
      } else if (nodeSizeMetric === "citations") {
        radius = calculateRadius(nodeData.Citations / 8);
      } else {
        radius = calculateRadius(0);
      }
      return radius;
    });
  }

  let nodeDegree = {};
  d3.map(data.links, (link) => {
    updateNodeDegree(link.source);
    updateNodeDegree(link.target);
  });

  function updateNodeDegree(nodeId) {
    if (nodeId in nodeDegree) {
      nodeDegree[nodeId]++;
    } else {
      nodeDegree[nodeId] = 0;
    }
  }

  const scaleRadius = d3
    .scaleLinear()
    .domain(d3.extent(Object.values(nodeDegree)))
    .range([3, 12]);

  const colorScale = d3
    .scaleSequential()
    .domain([1995, 2020])
    .interpolator(d3.interpolateBlues);

  let collideInput = document.getElementById("collideForce");
  let chargeInput = document.getElementById("chargeForce");
  let linkStrengthInput = document.getElementById("linkStrength");

  collideInput.addEventListener("input", updateCollideForce);
  chargeInput.addEventListener("input", updateChargeForce);
  linkStrengthInput.addEventListener("input", updateLinkStrength);

  let collideForce = d3.forceCollide().radius(0);
  let chargeForce = d3.forceManyBody().strength(-55);
  let linkForce = d3
    .forceLink(data.links)
    .id((link) => link.id)
    .strength(0.4);

  let forceSimulation = d3
    .forceSimulation(data.nodes)
    .force("collide", collideForce)
    .force("x", d3.forceX())
    .force("y", d3.forceY())
    .force("charge", chargeForce)
    .force("link", linkForce)
    .on("tick", onSimulationTick);

  function updateCollideForce() {
    let radius = parseInt(collideInput.value);
    collideForce.radius(radius);
    forceSimulation.alpha(0.5).restart();
  }

  function updateChargeForce() {
    let strength = parseInt(chargeInput.value);
    chargeForce.strength(strength);
    forceSimulation.alpha(0.5).restart();
  }

  function updateLinkStrength() {
    let strength = parseFloat(linkStrengthInput.value);
    linkForce.strength(strength);
    forceSimulation.alpha(0.5).restart();
  }

  let linkElements = mainGroup
    .append("g")
    .attr("transform", `translate(${graphWidth / 2},${graphHeight / 2})`)
    .attr("stroke", "#999")
    .attr("stroke-width", "3")
    .attr("stroke-opacity", 0.6)
    .selectAll(".graph-link")
    .data(data.links)
    .enter()
    .append("line");

  const nodeElements = mainGroup
    .append("g")
    .attr("transform", `translate(${graphWidth / 2},${graphHeight / 2})`)
    .selectAll(".graph-node")
    .data(data.nodes)
    .enter()
    .append("g")
    .attr("r", (nodeData) => nodeData.Citations)
    .attr("fill", (nodeData) => colorScale(nodeData.Year))
    .attr(
      "class",
      (nodeData) =>
        "group-" + nodeData.Country.replace(/\s+/g, "-").toLowerCase()
    )
    .on("click", function (nodeData, graphData) {
      displayNodeInfo(nodeData);
    });

  nodeElements.append("circle").attr("r", function (nodeData) {
    if (nodeDegree[nodeData.id] !== undefined) {
      return scaleRadius(nodeDegree[nodeData.id]);
    } else {
      return scaleRadius(0);
    }
  });

  function onSimulationTick() {
    nodeElements.attr(
      "transform",
      (nodeData) => `translate(${nodeData.x},${nodeData.y})`
    );
    linkElements
      .attr("x1", (linkData) => linkData.source.x)
      .attr("x2", (linkData) => linkData.target.x)
      .attr("y1", (linkData) => linkData.source.y)
      .attr("y2", (linkData) => linkData.target.y);
  }

  svgContainer.call(
    d3
      .zoom()
      .extent([
        [0, 0],
        [graphWidth, graphHeight],
      ])
      .scaleExtent([-1, 8])
      .on("zoom", onZoom)
  );

  function onZoom({ transform }) {
    mainGroup.attr("transform", transform);
  }

  // Call the updateNodeRadius function initially
  updateNodeRadius();

  function calculateRadius(value) {
    return scaleRadius(value);
  }

  function displayNodeInfo(nodeData) {
    d3.selectAll("#paper").text(` ${nodeData.Title}`);
    d3.selectAll("#name").text(` ${nodeData.Authors}`);
    d3.selectAll("#country").text(` ${nodeData.Country}`);
    d3.selectAll("#publication").text(` ${nodeData.Publisher}`);
    nodeElements.classed("inactive", true);
    const selectedClass = d3.select(this).attr("class").split(" ")[0];
    d3.selectAll(".group-" + selectedClass).classed("inactive", false);
  }
}
