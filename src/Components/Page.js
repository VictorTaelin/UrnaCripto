var React = require("react");
var ReactDOM = require("react-dom");
module.exports = React.createClass({
  getInitialState: function(){
    return {expand: true};
  },
  toggle: function(){
    this.setState({expand: !this.state.expand});
    this.props.onToggle && this.props.onToggle(!this.state.expand);
  },
  render: function(){
    return <div className="page">
      <div className="pageTitle" onClick={this.toggle}>
        {this.props.title}
      </div>
      <div className="pageBody" style={{"display":this.state.expand?"block":"none"}}>
        {this.props.children}
      </div>
    </div>
  }
});
