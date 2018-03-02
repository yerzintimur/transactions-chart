(function () {
  'use strict';

  function TransactionWidget(container) {
    this.init(container)
  }

  TransactionWidget.prototype.init = function (container) {
    this.container = container;
    this.createElements();
    let isActiveRequest = false;
    this.state = {};
    Object.defineProperties(this.state, {
      isActiveRequest: {
        get: () => {
          return isActiveRequest;
        },
        set: value => {
          isActiveRequest = value;
          this.setLoading(value);
        }
      }
    });
    this.range = this.getRange();

    this.getData(this.range)
      .then(
        result => {
          this.createControls();
          this.draw(result);
        },
        error => {
          console.error(error);
        }
      );
  };

  TransactionWidget.prototype.createElements = function () {
    this.controls = document.createElement('div');
    this.previous = document.createElement('button');
    this.next = document.createElement('button');
    this.current = document.createElement('div');
    this.canvas = document.createElement('canvas');
    this.loading = document.createElement('div');

    this.controls.className = 'controls';
    this.current.className = 'current';
    this.previous.className = 'btn btn-prev';
    this.previous.dataset.direction = 'prev';
    this.next.className = 'btn btn-next';
    this.next.dataset.direction = 'next';
    this.previous.innerHTML = '<';
    this.next.innerHTML = '>';
    this.loading.className = 'loading inactive';
    this.loading.innerHTML = 'Loading...';

    this.controls.appendChild(this.previous);
    this.controls.appendChild(this.next);
    this.controls.appendChild(this.current);
    this.container.appendChild(this.canvas);
    this.container.appendChild(this.controls);
    this.container.appendChild(this.loading);
  };

  TransactionWidget.prototype.createControls = function () {
    let endDate = this.range.end;
    let checkNext = () => {
      this.canNext = !this._isSameDay(endDate, new Date());
      this.next.classList[this.canNext ? 'remove' : 'add']('disabled');
    };

    checkNext();
    this.changeDateHandler = event => {
      event.preventDefault();
      if(this.state.isActiveRequest) return;
      let direction = event.target.dataset.direction;
      if(direction === 'prev') {
        this.range = this.getRange(new Date(endDate.setDate(endDate.getDate()-1)));
      } else if(direction === 'next') {
        if(!this.canNext) return;
        this.range = this.getRange(new Date(endDate.setDate(endDate.getDate()+1)));
      }
      this.getData(this.range)
        .then(
          result => {
            this.update(result);
            checkNext();
          },
          error => {
            console.error(error);
          }
        );
    };

    this.next.addEventListener('click', this.changeDateHandler, false);
    this.previous.addEventListener('click', this.changeDateHandler, false);
  };

  TransactionWidget.prototype.getRange = function (endDate) {
    endDate = endDate || new Date();
    let startDate = new Date();
    let datesPull = [];

    startDate.setTime(endDate.getTime()-6*24*3600*1000);
    for(let i = 0; i < 7; i++) {
      let day = new Date(startDate);
      day.setDate(startDate.getDate()+i);
      datesPull.push(day);
    }

    return {
      start: startDate,
      end: endDate,
      range: datesPull
    }
  };

  TransactionWidget.prototype.getData = function (params) {
    return new Promise((resolve, reject) => {
      this.state.isActiveRequest = true;
      let xhr = new XMLHttpRequest();
      xhr.open('GET', `/api/transactions/${this._dateStructure(params.start)}/${this._dateStructure(params.end)}`, true);
      xhr.responseType = 'json';
      xhr.onreadystatechange = () => {
        this.state.isActiveRequest = false;
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            resolve(this.prepareData(xhr.response, params.range));
          } else {
            reject( xhr.status + ': ' + xhr.statusText );
          }
        }
      };
      xhr.send();
    });
  };

  TransactionWidget.prototype.prepareData = function (data, range) {
    let result = {
      labels: [],
      datasets: [
        {
          label: 'Expence',
          data: [],
          backgroundColor: 'rgba(255, 0, 0, 1)',
          borderWidth: 0
        },
        {
          label: 'Income',
          data: [],
          backgroundColor: 'rgba(0, 255, 0, 1)',
          borderWidth: 0
        }
      ]
    };
    range.forEach(day => {
      let currentExpences = 0;
      let currentIncomes = 0;
      data.reduce((previous, current) => {
        let currentDate = new Date(current.date);
        if(this._isSameDay(day, currentDate)) {
          if(current.value > 0) {
            currentIncomes += previous ? previous.value + current.value : current.value;
          } else {
            currentExpences += previous ? previous.value + current.value : current.value;
          }
        }
      });

      result.labels.push(day.getDate());
      result.datasets[0].data.push(currentExpences*-1);
      result.datasets[1].data.push(currentIncomes);
    });

    return result;
  };

  TransactionWidget.prototype.getWeek = function () {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    let weekStart = `${monthNames[this.range.start.getMonth()]} ${this.range.start.getDate()}`;
    let weekEnd = ' &minus; ';
    let startWeekFullYear = this.range.start.getFullYear();
    let startWeekMonth = this.range.start.getMonth();
    let endWeekMonth = this.range.end.getMonth();
    let endWeekFullYear = this.range.end.getFullYear();

    if(startWeekFullYear !== endWeekFullYear) {
      weekStart += `, ${startWeekFullYear}`;
    }

    if(startWeekMonth !== endWeekMonth) {
      weekEnd += `${monthNames[endWeekMonth]} `;
    }

    weekEnd += this.range.end.getDate();
    weekEnd += `, ${endWeekFullYear}`;

    return weekStart + weekEnd;
  };

  TransactionWidget.prototype.draw = function (data) {
    this.chart = new Chart(this.canvas, {
      type: 'bar',
      data: data,
      options: {
        legend: {
          position: 'top'
        },
        scales: {
          yAxes: [{
            ticks: {
              display: false,
              beginAtZero:true
            }
          }]
        }
      }
    });

    this.current.innerHTML = this.getWeek();
  };

  TransactionWidget.prototype.update = function (data) {
    this.chart.data = data;
    this.chart.update({duration: 0});
    this.current.innerHTML = this.getWeek();
  };

  TransactionWidget.prototype.setLoading = function (isShow) {
    this.loading.classList[isShow ? 'remove' : 'add']('inactive');
  };

  TransactionWidget.prototype.destroy = function () {

  };

  TransactionWidget.prototype._dateStructure = function dateStructure(date) {
    return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
  };

  TransactionWidget.prototype._isSameDay = function(day1, day2) {
    return day1.getFullYear() === day2.getFullYear() &&
      day1.getMonth() === day2.getMonth() &&
      day1.getDate() === day2.getDate()
  };

  document.addEventListener('DOMContentLoaded', function() {
    let graphs = document.querySelectorAll('.transactions-graph');
    for(let i = 0; i < graphs.length; i++) {
      new TransactionWidget(graphs[i]);
    }
  });
})();