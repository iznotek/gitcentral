/* eslint-disable */
/**

 * This is the container that displays the repo itself. It needs access to the
 * redux state to receive the commit data returned from the api call. Does not
 * need to dispatch to the redux state.
 *
 * While this is a container, React is not actually being used to manipulate the
 * DOM here. We simply call a function that will directly go to our canvas and
 * draw on it, bypassing React.
 */

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import GithubApiInterface from '../reducers/gitD3/githubBranchFunction';
// import tooltip from '../reducers/gitD3/d3tip.js';
import _  from 'lodash';
import $ from 'jquery';
import displayHelpers from './display_helpers';
import generateCoordinates from './coordinate_generator';
// import floatingTooltip from './tool_tip.js';
// d3.tip = tooltip;

class RepoDisplay extends Component {

  makeD3Display () {
    $('#container').empty();
    //$('.d3-tip').remove();
    // $('body').append('<div id="container"></div>');

    const pageWidth = window.innerWidth;
    const pageHeight = window.innerHeight;

    const githubTranslator = new GithubApiInterface(
      this.props.currentRepo.JSONCommits,
      this.props.currentRepo.JSONBranches
    );

    const {
      JSONBranches,
      SHALookup,
      branchLookup,
      originalBranches,
      JSONCommits: d3commits
    } = githubTranslator;

    const {
      showToolTip,
      makeAnchor,
      zoomed,
      renderRepoName,
      addColors,
      addDates,
      getCommitDate,
      floatingTooltip
    } = displayHelpers;

    const tooltip = floatingTooltip('container_tooltip', 100, '#container');
    let tooltipOnMouseover = false;
    let tooltipOnNode = false;

    $('.tooltip').on('mouseover', function(){
      tooltipOnMouseover = true;
    });
    $('.tooltip').on('mouseout', function(){
      tooltipOnMouseover = false;
      hideDetail();
    })

    addColors(branchLookup);
    generateCoordinates(d3commits, SHALookup, branchLookup);

    //https://bl.ocks.org/mbostock/6123708
    const zoom = d3.behavior.zoom()
      .scaleExtent([0.1, 10])
      .on("zoom", () => zoomed(svg));

    let svg = d3.select('#container').append('svg')
      .attr('width', pageWidth)
      .attr('height', pageHeight)
      .on('click', function() {
        d3.selectAll('.d3-tip')
          .style('opacity', 0)
          .html('');
      })
      .call(zoom);

    // svg.call(infoTip);

    let container = svg.append('g');
    const straightLineLocations = [];

    d3commits.forEach(commit => {
      commit.children.forEach(child => {
        let childObj = githubTranslator.getCommit(child);

        if(commit.y === childObj.y) {
          straightLineLocations.push({ y:commit.y, xStart: commit.x, xEnd: childObj.x });
        }

        //curved lines: http://stackoverflow.com/questions/34558943/draw-curve-between-two-points-using-diagonal-function-in-d3-js
        const curveData = [ {x:commit.x, y:commit.y },{x:childObj.x,  y:childObj.y}];
        const edge = svg.append('g');
        const diagonal = d3.svg.diagonal()
          .source(function(d) {return {"x":d[0].y, "y":d[0].x}; })
          .target(function(d) {return {"x":d[1].y, "y":d[1].x}; })
          .projection(function(d) { return [d.y, d.x]; });

        svg.select("g")
            .datum(curveData)
          .append("path")
            .attr("class", "line")
            .attr("d", diagonal)
            .attr("stroke-width", 1)
          .attr('stroke', branchLookup[commit.branch].color)
          .attr('fill', 'none');
      });
    });

    //Make the nodes
    const nodes = svg.append('g')
      .attr('class', 'commit')
      .selectAll('circle')
      .data(d3commits)
      .enter().append('circle')
      .attr('r', 5)
      .attr('cx', commit => commit.x)
      .attr('cy', commit => commit.y)
      .attr('stroke', commit => branchLookup[commit.branch].color)
      .attr('fill', commit => branchLookup[commit.branch].color);

  /*
   * Function called on mouseover to display the
   * details of a bubble in the tooltip.
   */
    function showDetail(d) {
      // change outline to indicate hover state.

      const content = `Date: ${('' + d.date).slice(0, 16)}
      ${originalBranches.includes(d.branch) ? 'Branch: ' + makeAnchor(d.branch, d.branchLink) + '\n' : '' }
      <br>
      <span>
        SHA: ${makeAnchor(d.sha.slice(0, 9) + '...', d.url)}
      </span>
      <br>
      <div>
        Author: ${d.author.login}
      <div>
      <br>
      Message: ${d.commit.message}`
      tooltip.showTooltip(content, d3.event);
    }

    // hides tooltip
    function hideDetail() {
      setTimeout(function(){
        if (!tooltipOnMouseover){
          tooltip.hideTooltip();
        }
      }, 3000);
    }

    //show the tool on hover
    nodes.on('mouseover', showDetail);
    nodes.on('mouseout', hideDetail);


    const highestNode = d3commits.reduce((highest, commit) => {
      return commit.y < highest ? commit : highest;
    });

    addDates(svg, d3commits, highestNode.y);
    renderRepoName(highestNode, svg);
  }


  render() {

    $('#loading').addClass('hidden');

    return (
      <div>
        {this.makeD3Display()}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return { currentRepo: state.currentRepo };
}

export default connect(mapStateToProps)(RepoDisplay);
