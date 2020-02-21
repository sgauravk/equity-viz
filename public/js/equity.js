const chartSize = { width: 1100, height: 600 };
const margin = { left: 100, right: 10, top: 20, bottom: 150 };
const width = chartSize.width - margin.left - margin.right;
const height = chartSize.height - margin.top - margin.bottom;

const initChart = () => {
  const svg = d3
    .select("#chart-area svg")
    .attr("height", chartSize.height)
    .attr("width", chartSize.width);

  const g = svg
    .append("g")
    .attr("class", "nifty")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("text")
    .attr("class", "x axis-label")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - margin.top - 50);

  g.append("text")
    .attr("class", "y axis-label")
    .attr("x", -(height / 2))
    .attr("y", -60);

  g.append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0,${height})`);

  g.append("g").attr("class", "y axis");
};

const updateChart = (Equity, fieldName) => {
  const firstDate = new Date(_.first(Equity).Date);
  const lastDate = new Date(_.last(Equity).Date);
  //const format = fieldFormat[fieldName];
  //showData(Equity, fieldName);

  const svg = d3.select("#chart-area svg .nifty");
  const minDomain = Math.min(
    _.minBy(Equity, fieldName)[fieldName],
    _.minBy(Equity, "Average")["Average"]
  );
  const maxDomain = Math.max(
    _.maxBy(Equity, fieldName)[fieldName],
    _.maxBy(Equity, "Average")["Average"]
  );
  svg.selectAll("path").remove();
  document.getElementById("transactions").innerHTML = "";

  const header = [
    "Sr. No.",
    "BuyDate",
    "BuyingPrice",
    "SellDate",
    "SellingPrice",
    "profit/Loss"
  ];

  const transactionTable = d3
    .select("#transactions")
    .attr(
      "class",
      "objecttable table table-striped table-bordered table-hover"
    );
  transactionTable
    .append("thead")
    .selectAll("th")
    .data(header)
    .enter()
    .append("th")
    .text(x => x);

  const tableTransactions = parseTransaction(reacordTransactons(Equity));
  tableTransactions.forEach(d => {
    transactionTable
      .append("tr")
      .selectAll("td")
      .data(d)
      .enter()
      .append("td")
      .text(x => x);
  });

  const y = d3
    .scaleLinear()
    .domain([minDomain, maxDomain])
    .range([height, 0]);

  svg.select(".y.axis-label").text(fieldName);
  svg.select(".x.axis-label").text("Year");

  const yAxis = d3
    .axisLeft(y)
    .ticks(10)
    .tickFormat(y(Equity[fieldName]));

  svg.select(".y.axis").call(yAxis);

  const x = d3
    .scaleTime()
    .domain([firstDate, lastDate])
    .range([0, width]);

  const xAxis = d3.axisBottom(x);
  svg.select(".x.axis").call(xAxis);

  const line = field =>
    d3
      .line()
      .x(q => x(new Date(q.Date)))
      .y(q => y(q[field]));

  svg
    .append("path")
    .attr("class", "close")
    .attr("d", line(fieldName)(Equity));

  svg
    .append("path")
    .attr("class", "average")
    .attr("d", line("Average")(Equity));

  createGraph(svg);
};

const createGraph = svg => {
  const xAxis = svg.selectAll(".x.axis .tick");
  const yAxis = svg.selectAll(".y.axis .tick");

  xAxis.selectAll("line").attr("y2", -height);
  yAxis.selectAll("line").attr("x2", width);
}

const findAverage = data => {
  let sum = data.reduce(
    (x, y) => {
      return { Close: x.Close + y.Close };
    },
    { Close: 0 }
  ).Close;
  return Math.round(sum / data.length);
};

const rangeSlider = Equity => {
  const slider = createD3RangeSlider(0, Equity.length - 1, "#slider-container");
  slider.range(0, Equity.length - 1);

  slider.onChange(newRange => {
    const firstDate = Equity[newRange.begin].Date;
    const lastDate = Equity[newRange.end].Date;
    d3.select("#range-label").text(firstDate + " - " + lastDate);
    updateChart(Equity.slice(newRange.begin, newRange.end + 1), "Close");
  });
};

const parseTransaction = transactions => {
  const filteredDate = transactions.filter(x => Object.keys(x).length == 2);
  return filteredDate.map((x ,i) => [
    ++i,
    x.Buy.Date,
    x.Buy.Close.toFixed(2),
    x.Sell.Date,
    x.Sell.Close.toFixed(2),
    calculateProfitOrLose(x.Sell.Close, x.Buy.Close)
  ]);
};

const calculateProfitOrLose = (sell, buy) => {
  if (buy > sell) return (buy - sell).toFixed(2) + "  L";
  return (sell - buy).toFixed(2) + "  P";
};

const reacordTransactons = Equity => {
  const allTransactions = new Array();
  let hasBought = false;
  Equity.forEach(d => {
    if (d.Close <= d.Average && hasBought) {
      _.last(allTransactions).Sell = d;
      hasBought = false;
    }
    if (d.Close > d.Average && !hasBought) {
      allTransactions.push({ Buy: d });
      hasBought = true;
    }
  });
  return allTransactions;
};

const AnalyseData = data => {
  let startingIndex = 0;
  data.forEach((d, i) => {
    i >= 100 && (startingIndex = i - 99);
    d.Average = findAverage(data.slice(startingIndex, ++i));
  });
  return data;
};

const startVisualization = Equity => {
  initChart();
  updateChart(Equity, "Close");
  rangeSlider(Equity);

  //setInterval(() => updateChart(Equity, nextName()), 1500);
  //frequentlyMoveEquity(Equity, []);
};

const parseEquity = ({ Date, Volume, AdjClose, ...rest }) => {
  _.forEach(rest, (v, k) => (rest[k] = +v));
  const Time = new this.Date();
  return { Date, ...rest, Time };
};

const main = () => {
  d3.csv("data/nifty.csv", parseEquity)
    .then(AnalyseData)
    .then(startVisualization);
};

window.onload = main;
