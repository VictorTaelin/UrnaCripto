var React = require("react");
var ReactDOM = require("react-dom");
module.exports = React.createClass({
  getInitialState: function(){
    return {expand: false};
  },
  toggle: function(){
    this.setState({expand: !this.state.expand});
    this.props.onToggle && this.props.onToggle(!this.state.expand);
  },
  render: function(){
    return <div className="page">
      <div className="page-title" onClick={this.toggle}>
        {this.props.title}
      </div>
      <div className="page-body" style={{"display":this.state.expand?"block":"none"}}>
        {this.props.children}
      </div>
    </div>
  }
});
