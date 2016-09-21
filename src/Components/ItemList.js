var React = require("react");
var ReactDOM = require("react-dom");
module.exports = React.createClass({
  getInitialState: function(){
    return {
      newElement: "",
      elements: []};
  },
  addElement: function(){
    var newElements = this.state.elements.concat([this.state.newElement]);
    if (this.state.newElement.length > 0){
      this.setState({newElement: "", elements: newElements});
      this.props.onUpdateList(newElements);
    };
  },
  delElement: function(value){
    var newElements = this.state.elements.filter(function(element){ return element !== value; });
    this.setState({elements: newElements});
    this.props.onUpdateList(newElements);
  },
  onChange: function(e){
    this.setState({newElement: e.target.value});
  },
  onKeyUp: function(e){
    if (e.which === 13)
      this.addElement();
  },
  render: function(){
    return <div>
      <table className="ItemListTable">
        <tbody>
          {this.state.elements.map(function(element){
            return <tr key={element}>
              <td>
                <span>{element}</span>
              </td>
              <td>
                <button className="ItemListButton" onClick={function(){ this.delElement(element); }.bind(this)}>
                  -
                </button>
              </td>
            </tr>
          }.bind(this))}
          <tr>
            <td>
              <input onChange={this.onChange} value={this.state.newElement} onKeyUp={this.onKeyUp}/>
            </td>
            <td>
              <button className="ItemListButton" onClick={this.addElement}>
                +
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  }
});


