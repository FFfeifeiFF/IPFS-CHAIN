// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package template

import (
	"errors"
	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
	"math/big"
	"strings"

)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
	_ = abi.ConvertType
)

// TemplateMetaData contains all meta data concerning the Template contract.
var TemplateMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"timestamp\",\"type\":\"uint256\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"caller\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"string\",\"name\":\"username\",\"type\":\"string\"},{\"indexed\":false,\"internalType\":\"string\",\"name\":\"operationType\",\"type\":\"string\"},{\"indexed\":false,\"internalType\":\"string\",\"name\":\"targetIdentifier\",\"type\":\"string\"},{\"indexed\":false,\"internalType\":\"string\",\"name\":\"details\",\"type\":\"string\"}],\"name\":\"OperationRecorded\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"name\":\"operationLog\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"timestamp\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"caller\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"username\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"operationType\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"targetIdentifier\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"details\",\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\",\"constant\":true},{\"inputs\":[],\"name\":\"owner\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\",\"constant\":true},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"_username\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"_operationType\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"_targetIdentifier\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"_details\",\"type\":\"string\"}],\"name\":\"recordOperation\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getOperationLogCount\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\",\"constant\":true}]",
}

// TemplateABI is the input ABI used to generate the binding from.
// Deprecated: Use TemplateMetaData.ABI instead.
var TemplateABI = TemplateMetaData.ABI

// Template is an auto generated Go binding around an Ethereum contract.
type Template struct {
	TemplateCaller     // Read-only binding to the contract
	TemplateTransactor // Write-only binding to the contract
	TemplateFilterer   // Log filterer for contract events
}

// TemplateCaller is an auto generated read-only Go binding around an Ethereum contract.
type TemplateCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TemplateTransactor is an auto generated write-only Go binding around an Ethereum contract.
type TemplateTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TemplateFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type TemplateFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TemplateSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type TemplateSession struct {
	Contract     *Template         // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// TemplateCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type TemplateCallerSession struct {
	Contract *TemplateCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts   // Call options to use throughout this session
}

// TemplateTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type TemplateTransactorSession struct {
	Contract     *TemplateTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts   // Transaction auth options to use throughout this session
}

// TemplateRaw is an auto generated low-level Go binding around an Ethereum contract.
type TemplateRaw struct {
	Contract *Template // Generic contract binding to access the raw methods on
}

// TemplateCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type TemplateCallerRaw struct {
	Contract *TemplateCaller // Generic read-only contract binding to access the raw methods on
}

// TemplateTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type TemplateTransactorRaw struct {
	Contract *TemplateTransactor // Generic write-only contract binding to access the raw methods on
}

// NewTemplate creates a new instance of Template, bound to a specific deployed contract.
func NewTemplate(address common.Address, backend bind.ContractBackend) (*Template, error) {
	contract, err := bindTemplate(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &Template{TemplateCaller: TemplateCaller{contract: contract}, TemplateTransactor: TemplateTransactor{contract: contract}, TemplateFilterer: TemplateFilterer{contract: contract}}, nil
}

// NewTemplateCaller creates a new read-only instance of Template, bound to a specific deployed contract.
func NewTemplateCaller(address common.Address, caller bind.ContractCaller) (*TemplateCaller, error) {
	contract, err := bindTemplate(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &TemplateCaller{contract: contract}, nil
}

// NewTemplateTransactor creates a new write-only instance of Template, bound to a specific deployed contract.
func NewTemplateTransactor(address common.Address, transactor bind.ContractTransactor) (*TemplateTransactor, error) {
	contract, err := bindTemplate(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &TemplateTransactor{contract: contract}, nil
}

// NewTemplateFilterer creates a new log filterer instance of Template, bound to a specific deployed contract.
func NewTemplateFilterer(address common.Address, filterer bind.ContractFilterer) (*TemplateFilterer, error) {
	contract, err := bindTemplate(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &TemplateFilterer{contract: contract}, nil
}

// bindTemplate binds a generic wrapper to an already deployed contract.
func bindTemplate(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := TemplateMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Template *TemplateRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Template.Contract.TemplateCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Template *TemplateRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Template.Contract.TemplateTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Template *TemplateRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Template.Contract.TemplateTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Template *TemplateCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Template.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Template *TemplateTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Template.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Template *TemplateTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Template.Contract.contract.Transact(opts, method, params...)
}

// GetOperationLogCount is a free data retrieval call binding the contract method 0xb81a659b.
//
// Solidity: function getOperationLogCount() view returns(uint256)
func (_Template *TemplateCaller) GetOperationLogCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _Template.contract.Call(opts, &out, "getOperationLogCount")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetOperationLogCount is a free data retrieval call binding the contract method 0xb81a659b.
//
// Solidity: function getOperationLogCount() view returns(uint256)
func (_Template *TemplateSession) GetOperationLogCount() (*big.Int, error) {
	return _Template.Contract.GetOperationLogCount(&_Template.CallOpts)
}

// GetOperationLogCount is a free data retrieval call binding the contract method 0xb81a659b.
//
// Solidity: function getOperationLogCount() view returns(uint256)
func (_Template *TemplateCallerSession) GetOperationLogCount() (*big.Int, error) {
	return _Template.Contract.GetOperationLogCount(&_Template.CallOpts)
}

// OperationLog is a free data retrieval call binding the contract method 0x9d1a853f.
//
// Solidity: function operationLog(uint256 ) view returns(uint256 timestamp, address caller, string username, string operationType, string targetIdentifier, string details)
func (_Template *TemplateCaller) OperationLog(opts *bind.CallOpts, arg0 *big.Int) (struct {
	Timestamp        *big.Int
	Caller           common.Address
	Username         string
	OperationType    string
	TargetIdentifier string
	Details          string
}, error) {
	var out []interface{}
	err := _Template.contract.Call(opts, &out, "operationLog", arg0)

	outstruct := new(struct {
		Timestamp        *big.Int
		Caller           common.Address
		Username         string
		OperationType    string
		TargetIdentifier string
		Details          string
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.Timestamp = *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)
	outstruct.Caller = *abi.ConvertType(out[1], new(common.Address)).(*common.Address)
	outstruct.Username = *abi.ConvertType(out[2], new(string)).(*string)
	outstruct.OperationType = *abi.ConvertType(out[3], new(string)).(*string)
	outstruct.TargetIdentifier = *abi.ConvertType(out[4], new(string)).(*string)
	outstruct.Details = *abi.ConvertType(out[5], new(string)).(*string)

	return *outstruct, err

}

// OperationLog is a free data retrieval call binding the contract method 0x9d1a853f.
//
// Solidity: function operationLog(uint256 ) view returns(uint256 timestamp, address caller, string username, string operationType, string targetIdentifier, string details)
func (_Template *TemplateSession) OperationLog(arg0 *big.Int) (struct {
	Timestamp        *big.Int
	Caller           common.Address
	Username         string
	OperationType    string
	TargetIdentifier string
	Details          string
}, error) {
	return _Template.Contract.OperationLog(&_Template.CallOpts, arg0)
}

// OperationLog is a free data retrieval call binding the contract method 0x9d1a853f.
//
// Solidity: function operationLog(uint256 ) view returns(uint256 timestamp, address caller, string username, string operationType, string targetIdentifier, string details)
func (_Template *TemplateCallerSession) OperationLog(arg0 *big.Int) (struct {
	Timestamp        *big.Int
	Caller           common.Address
	Username         string
	OperationType    string
	TargetIdentifier string
	Details          string
}, error) {
	return _Template.Contract.OperationLog(&_Template.CallOpts, arg0)
}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_Template *TemplateCaller) Owner(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _Template.contract.Call(opts, &out, "owner")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_Template *TemplateSession) Owner() (common.Address, error) {
	return _Template.Contract.Owner(&_Template.CallOpts)
}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_Template *TemplateCallerSession) Owner() (common.Address, error) {
	return _Template.Contract.Owner(&_Template.CallOpts)
}

// RecordOperation is a paid mutator transaction binding the contract method 0xab13c48e.
//
// Solidity: function recordOperation(string _username, string _operationType, string _targetIdentifier, string _details) returns()
func (_Template *TemplateTransactor) RecordOperation(opts *bind.TransactOpts, _username string, _operationType string, _targetIdentifier string, _details string) (*types.Transaction, error) {
	return _Template.contract.Transact(opts, "recordOperation", _username, _operationType, _targetIdentifier, _details)
}

// RecordOperation is a paid mutator transaction binding the contract method 0xab13c48e.
//
// Solidity: function recordOperation(string _username, string _operationType, string _targetIdentifier, string _details) returns()
func (_Template *TemplateSession) RecordOperation(_username string, _operationType string, _targetIdentifier string, _details string) (*types.Transaction, error) {
	return _Template.Contract.RecordOperation(&_Template.TransactOpts, _username, _operationType, _targetIdentifier, _details)
}

// RecordOperation is a paid mutator transaction binding the contract method 0xab13c48e.
//
// Solidity: function recordOperation(string _username, string _operationType, string _targetIdentifier, string _details) returns()
func (_Template *TemplateTransactorSession) RecordOperation(_username string, _operationType string, _targetIdentifier string, _details string) (*types.Transaction, error) {
	return _Template.Contract.RecordOperation(&_Template.TransactOpts, _username, _operationType, _targetIdentifier, _details)
}

// TemplateOperationRecordedIterator is returned from FilterOperationRecorded and is used to iterate over the raw logs and unpacked data for OperationRecorded events raised by the Template contract.
type TemplateOperationRecordedIterator struct {
	Event *TemplateOperationRecorded // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *TemplateOperationRecordedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TemplateOperationRecorded)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(TemplateOperationRecorded)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *TemplateOperationRecordedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TemplateOperationRecordedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TemplateOperationRecorded represents a OperationRecorded event raised by the Template contract.
type TemplateOperationRecorded struct {
	Timestamp        *big.Int
	Caller           common.Address
	Username         string
	OperationType    string
	TargetIdentifier string
	Details          string
	Raw              types.Log // Blockchain specific contextual infos
}

// FilterOperationRecorded is a free log retrieval operation binding the contract event 0xc5fdeb54a77ff3db62da1962b4eb3de21f364cbde1b9a880fe74c359119a361e.
//
// Solidity: event OperationRecorded(uint256 timestamp, address indexed caller, string username, string operationType, string targetIdentifier, string details)
func (_Template *TemplateFilterer) FilterOperationRecorded(opts *bind.FilterOpts, caller []common.Address) (*TemplateOperationRecordedIterator, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _Template.contract.FilterLogs(opts, "OperationRecorded", callerRule)
	if err != nil {
		return nil, err
	}
	return &TemplateOperationRecordedIterator{contract: _Template.contract, event: "OperationRecorded", logs: logs, sub: sub}, nil
}

// WatchOperationRecorded is a free log subscription operation binding the contract event 0xc5fdeb54a77ff3db62da1962b4eb3de21f364cbde1b9a880fe74c359119a361e.
//
// Solidity: event OperationRecorded(uint256 timestamp, address indexed caller, string username, string operationType, string targetIdentifier, string details)
func (_Template *TemplateFilterer) WatchOperationRecorded(opts *bind.WatchOpts, sink chan<- *TemplateOperationRecorded, caller []common.Address) (event.Subscription, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _Template.contract.WatchLogs(opts, "OperationRecorded", callerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TemplateOperationRecorded)
				if err := _Template.contract.UnpackLog(event, "OperationRecorded", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseOperationRecorded is a log parse operation binding the contract event 0xc5fdeb54a77ff3db62da1962b4eb3de21f364cbde1b9a880fe74c359119a361e.
//
// Solidity: event OperationRecorded(uint256 timestamp, address indexed caller, string username, string operationType, string targetIdentifier, string details)
func (_Template *TemplateFilterer) ParseOperationRecorded(log types.Log) (*TemplateOperationRecorded, error) {
	event := new(TemplateOperationRecorded)
	if err := _Template.contract.UnpackLog(event, "OperationRecorded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
