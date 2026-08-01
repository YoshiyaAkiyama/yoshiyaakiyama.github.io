const margin = {top: 40, right: 30, bottom: 100, left: 60},
      width = 800 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

const svg = d3.select("#chart-container")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("#chart-container")
  .append("div")
    .attr("class", "tooltip");

d3.csv("titanic.csv").then(function(data) {
    const pageId = document.body.id;
    
    if (pageId === "page-class") {
        d3.select("#narrative-text").text("This Visual Narrative shares the Survival rate of individuals who rode Titanic based on Socio-economic status and gender.  First we will view Socio-economic status. First-class passengers had a much higher likelihood of survival compared to those in Third class.");
        drawBasicChart(data, "class");
    } else if (pageId === "page-sex") {
        d3.select("#narrative-text").text("The 'Women and children first' code of conduct heavily influenced survival. The survival rate for women was vastly higher than for men.");
        drawBasicChart(data, "sex");
    } else if (pageId === "page-intersection") {
        d3.select("#narrative-text").text("Sex was a stronger proponent to survival than class. Even 3rd class women had a higher survival rate than 1st class men. Use the dropdowns to explore the data.");
        drawBasicChart(data, "intersection");
        
        // Add event listeners for exploration
        d3.select("#class-filter").on("change", () => updateExploration(data));
        d3.select("#sex-filter").on("change", () => updateExploration(data));
        d3.select("#embark-filter").on("change", () => updateExploration(data));
    }
});

function calculateAgeGroups(dataSubset) {
    let counts = {
        "0-17": 0,
        "18-24": 0,
        "25-44": 0,
        "45-64": 0,
        "65+": 0,
        "Unknown": 0
    };
    
    dataSubset.forEach(d => {
        if (!d.age || isNaN(parseFloat(d.age))) {
            counts["Unknown"]++;
            return;
        }
        let age = parseFloat(d.age);
        if (age < 18) counts["0-17"]++;
        else if (age < 25) counts["18-24"]++;
        else if (age < 45) counts["25-44"]++;
        else if (age < 65) counts["45-64"]++;
        else counts["65+"]++;
    });
    return counts;
}

function processGroup(subset, label) {
    let total = subset.length;
    let survived = subset.filter(d => d.survived === "1").length;
    let rate = total > 0 ? (survived / total) * 100 : 0;
    return {
        label: label,
        value: rate,
        total: total,
        ages: calculateAgeGroups(subset)
    };
}

function drawBasicChart(rawData, type) {
    let groupedData = [];
    
    if (type === "class") {
        const classes = ["First", "Second", "Third"];
        classes.forEach(c => {
            let subset = rawData.filter(d => d.class === c);
            groupedData.push(processGroup(subset, `${c} Class`));
        });
    } else if (type === "sex") {
        const sexes = ["male", "female"];
        sexes.forEach(s => {
            let subset = rawData.filter(d => d.sex === s);
            let label = s.charAt(0).toUpperCase() + s.slice(1);
            groupedData.push(processGroup(subset, label));
        });
    } else if (type === "intersection") {
        const sexes = ["male", "female"];
        const classes = ["First", "Second", "Third"];
        sexes.forEach(s => {
            classes.forEach(c => {
                let subset = rawData.filter(d => d.class === c && d.sex === s);
                let sLabel = s.charAt(0).toUpperCase() + s.slice(1);
                groupedData.push(processGroup(subset, `${c} ${sLabel}`));
            });
        });
    }

    renderChartLogic(groupedData, type === "intersection");
}

function updateExploration(rawData) {
    const classFilter = d3.select("#class-filter").property("value");
    const sexFilter = d3.select("#sex-filter").property("value");
    const embarkFilter = d3.select("#embark-filter").property("value");
    
    let filteredData = rawData;
    if (classFilter !== "All") {
        filteredData = filteredData.filter(d => d.class === classFilter);
    }
    if (sexFilter !== "All") {
        filteredData = filteredData.filter(d => d.sex === sexFilter);
    }
    if (embarkFilter !== "All") {
        filteredData = filteredData.filter(d => d.embark_town === embarkFilter);
    }

    let groupedData = [];
    
    if (classFilter === "All" && sexFilter === "All") {
        const sexes = ["male", "female"];
        const classes = ["First", "Second", "Third"];
        sexes.forEach(s => {
            classes.forEach(c => {
                let subset = filteredData.filter(d => d.class === c && d.sex === s);
                let sLabel = s.charAt(0).toUpperCase() + s.slice(1);
                groupedData.push(processGroup(subset, `${c} ${sLabel}`));
            });
        });
    } else if (classFilter === "All") {
        const classes = ["First", "Second", "Third"];
        classes.forEach(c => {
            let subset = filteredData.filter(d => d.class === c);
            groupedData.push(processGroup(subset, `${c} Class`));
        });
    } else if (sexFilter === "All") {
        const sexes = ["male", "female"];
        sexes.forEach(s => {
            let subset = filteredData.filter(d => d.sex === s);
            let label = s.charAt(0).toUpperCase() + s.slice(1);
            groupedData.push(processGroup(subset, label));
        });
    } else {
        let sLabel = sexFilter.charAt(0).toUpperCase() + sexFilter.slice(1);
        groupedData.push(processGroup(filteredData, `${classFilter} ${sLabel}`));
    }
    
    renderChartLogic(groupedData, false);
}

function renderChartLogic(groupedData, drawAnnotations) {
    svg.selectAll("*").remove();

    // X axis
    const x = d3.scaleBand()
      .range([ 0, width ])
      .domain(groupedData.map(d => d.label))
      .padding(0.2);
      
    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "12px");

    // Y axis
    const y = d3.scaleLinear()
      .domain([0, 100])
      .range([ height, 0]);
      
    svg.append("g")
      .call(d3.axisLeft(y).tickFormat(d => d + "%"))
      .selectAll("text")
        .style("font-size", "12px");

    // Y axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -50)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Survival Rate (%)");

    // Basic Bars
    svg.selectAll("rect")
      .data(groupedData)
      .enter()
      .append("rect")
        .attr("x", d => x(d.label))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", "#38bdf8")
        .on("mouseover", function(event, d) {
            d3.select(this).style("opacity", 0.8);
            tooltip.style("opacity", 1);
            
            let html = `<h4>${d.label} (Total: ${d.total})</h4>`;
            html += `<table>`;
            html += `<tr><td class="age-group">0-17:</td><td class="age-count">${d.ages["0-17"]}</td></tr>`;
            html += `<tr><td class="age-group">18-24:</td><td class="age-count">${d.ages["18-24"]}</td></tr>`;
            html += `<tr><td class="age-group">25-44:</td><td class="age-count">${d.ages["25-44"]}</td></tr>`;
            html += `<tr><td class="age-group">45-64:</td><td class="age-count">${d.ages["45-64"]}</td></tr>`;
            html += `<tr><td class="age-group">65+:</td><td class="age-count">${d.ages["65+"]}</td></tr>`;
            if (d.ages["Unknown"] > 0) {
                html += `<tr><td class="age-group" style="color:#777">Unknown:</td><td class="age-count" style="color:#777">${d.ages["Unknown"]}</td></tr>`;
            }
            html += `</table>`;
            
            tooltip.html(html);
            
            let tooltipWidth = tooltip.node().getBoundingClientRect().width;
            let xPosition = event.pageX + 15;
            if (event.pageX > window.innerWidth / 2) {
                xPosition = event.pageX - tooltipWidth - 15;
            }
            
            tooltip.style("left", xPosition + "px")
                   .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", function(event) {
            let tooltipWidth = tooltip.node().getBoundingClientRect().width;
            let xPosition = event.pageX + 15;
            if (event.pageX > window.innerWidth / 2) {
                xPosition = event.pageX - tooltipWidth - 15;
            }
            
            tooltip.style("left", xPosition + "px")
                   .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            d3.select(this).style("opacity", 1);
            tooltip.style("opacity", 0);
        });

    // Annotations
    if (drawAnnotations) {
        const thirdFem = groupedData.find(d => d.label === "Third Female");
        const firstMale = groupedData.find(d => d.label === "First Male");
        
        if (thirdFem && firstMale) {
            const annotations = [
              {
                note: {
                  title: "Sex > Class",
                  label: "Even 3rd class women (~50%) had higher survival than 1st class men (~37%).",
                  wrap: 120
                },
                x: x(thirdFem.label) + x.bandwidth() / 2,
                y: y(thirdFem.value),
                dx: -1,
                dy: -70,
                color: "#c2410c"
              },
              {
                note: {
                  title: "1st Class Men",
                  label: "Wealth didn't save them.",
                  wrap: 100
                },
                x: x(firstMale.label) + x.bandwidth() / 2,
                y: y(firstMale.value),
                dx: 50,
                dy: -40,
                color: "#c2410c"
              }
            ];
            
            const makeAnnotations = d3.annotation()
              .type(d3.annotationCallout)
              .annotations(annotations);
              
            svg.append("g")
              .style("font-size", "12px")
              .call(makeAnnotations);
        }
    }
}
