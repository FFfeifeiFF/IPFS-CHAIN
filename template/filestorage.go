// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package template

import (
	"errors"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
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

// FileStorageMetaData contains all meta data concerning the FileStorage contract.
var FileStorageMetaData = &bind.MetaData{
	ABI: "[{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"string\",\"name\":\"user\",\"type\":\"string\"},{\"indexed\":false,\"internalType\":\"string\",\"name\":\"filename\",\"type\":\"string\"},{\"indexed\":false,\"internalType\":\"string\",\"name\":\"ipfsHash\",\"type\":\"string\"},{\"indexed\":false,\"internalType\":\"string\",\"name\":\"description\",\"type\":\"string\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"timestamp\",\"type\":\"uint256\"}],\"name\":\"FileStored\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"name\":\"files\",\"outputs\":[{\"internalType\":\"string\",\"name\":\"user\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"filename\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"ipfsHash\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"description\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"timestamp\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\",\"constant\":true},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"_user\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"_filename\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"_ipfsHash\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"_description\",\"type\":\"string\"}],\"name\":\"storeFile\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getFileCount\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\",\"constant\":true},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_id\",\"type\":\"uint256\"}],\"name\":\"getFile\",\"outputs\":[{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\",\"constant\":true}]",
}

// FileStorageABI is the input ABI used to generate the binding from.
// Deprecated: Use FileStorageMetaData.ABI instead.
var FileStorageABI = FileStorageMetaData.ABI

// FileStorage is an auto generated Go binding around an Ethereum contract.
type FileStorage struct {
	FileStorageCaller     // Read-only binding to the contract
	FileStorageTransactor // Write-only binding to the contract
	FileStorageFilterer   // Log filterer for contract events
}

// FileStorageCaller is an auto generated read-only Go binding around an Ethereum contract.
type FileStorageCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// FileStorageTransactor is an auto generated write-only Go binding around an Ethereum contract.
type FileStorageTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// FileStorageFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type FileStorageFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// FileStorageSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type FileStorageSession struct {
	Contract     *FileStorage      // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// FileStorageCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type FileStorageCallerSession struct {
	Contract *FileStorageCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts      // Call options to use throughout this session
}

// FileStorageTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type FileStorageTransactorSession struct {
	Contract     *FileStorageTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts      // Transaction auth options to use throughout this session
}

// FileStorageRaw is an auto generated low-level Go binding around an Ethereum contract.
type FileStorageRaw struct {
	Contract *FileStorage // Generic contract binding to access the raw methods on
}

// FileStorageCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type FileStorageCallerRaw struct {
	Contract *FileStorageCaller // Generic read-only contract binding to access the raw methods on
}

// FileStorageTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type FileStorageTransactorRaw struct {
	Contract *FileStorageTransactor // Generic write-only contract binding to access the raw methods on
}

// NewFileStorage creates a new instance of FileStorage, bound to a specific deployed contract.
func NewFileStorage(address common.Address, backend bind.ContractBackend) (*FileStorage, error) {
	contract, err := bindFileStorage(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &FileStorage{FileStorageCaller: FileStorageCaller{contract: contract}, FileStorageTransactor: FileStorageTransactor{contract: contract}, FileStorageFilterer: FileStorageFilterer{contract: contract}}, nil
}

// NewFileStorageCaller creates a new read-only instance of FileStorage, bound to a specific deployed contract.
func NewFileStorageCaller(address common.Address, caller bind.ContractCaller) (*FileStorageCaller, error) {
	contract, err := bindFileStorage(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &FileStorageCaller{contract: contract}, nil
}

// NewFileStorageTransactor creates a new write-only instance of FileStorage, bound to a specific deployed contract.
func NewFileStorageTransactor(address common.Address, transactor bind.ContractTransactor) (*FileStorageTransactor, error) {
	contract, err := bindFileStorage(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &FileStorageTransactor{contract: contract}, nil
}

// NewFileStorageFilterer creates a new log filterer instance of FileStorage, bound to a specific deployed contract.
func NewFileStorageFilterer(address common.Address, filterer bind.ContractFilterer) (*FileStorageFilterer, error) {
	contract, err := bindFileStorage(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &FileStorageFilterer{contract: contract}, nil
}

// bindFileStorage binds a generic wrapper to an already deployed contract.
func bindFileStorage(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := FileStorageMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_FileStorage *FileStorageRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _FileStorage.Contract.FileStorageCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_FileStorage *FileStorageRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _FileStorage.Contract.FileStorageTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_FileStorage *FileStorageRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _FileStorage.Contract.FileStorageTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_FileStorage *FileStorageCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _FileStorage.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_FileStorage *FileStorageTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _FileStorage.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_FileStorage *FileStorageTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _FileStorage.Contract.contract.Transact(opts, method, params...)
}

// Files is a free data retrieval call binding the contract method 0xf4c714b4.
//
// Solidity: function files(uint256 ) view returns(string user, string filename, string ipfsHash, string description, uint256 timestamp)
func (_FileStorage *FileStorageCaller) Files(opts *bind.CallOpts, arg0 *big.Int) (struct {
	User        string
	Filename    string
	IpfsHash    string
	Description string
	Timestamp   *big.Int
}, error) {
	var out []interface{}
	err := _FileStorage.contract.Call(opts, &out, "files", arg0)

	outstruct := new(struct {
		User        string
		Filename    string
		IpfsHash    string
		Description string
		Timestamp   *big.Int
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.User = *abi.ConvertType(out[0], new(string)).(*string)
	outstruct.Filename = *abi.ConvertType(out[1], new(string)).(*string)
	outstruct.IpfsHash = *abi.ConvertType(out[2], new(string)).(*string)
	outstruct.Description = *abi.ConvertType(out[3], new(string)).(*string)
	outstruct.Timestamp = *abi.ConvertType(out[4], new(*big.Int)).(**big.Int)

	return *outstruct, err

}

// Files is a free data retrieval call binding the contract method 0xf4c714b4.
//
// Solidity: function files(uint256 ) view returns(string user, string filename, string ipfsHash, string description, uint256 timestamp)
func (_FileStorage *FileStorageSession) Files(arg0 *big.Int) (struct {
	User        string
	Filename    string
	IpfsHash    string
	Description string
	Timestamp   *big.Int
}, error) {
	return _FileStorage.Contract.Files(&_FileStorage.CallOpts, arg0)
}

// Files is a free data retrieval call binding the contract method 0xf4c714b4.
//
// Solidity: function files(uint256 ) view returns(string user, string filename, string ipfsHash, string description, uint256 timestamp)
func (_FileStorage *FileStorageCallerSession) Files(arg0 *big.Int) (struct {
	User        string
	Filename    string
	IpfsHash    string
	Description string
	Timestamp   *big.Int
}, error) {
	return _FileStorage.Contract.Files(&_FileStorage.CallOpts, arg0)
}

// GetFile is a free data retrieval call binding the contract method 0x2bfda313.
//
// Solidity: function getFile(uint256 _id) view returns(string, string, string, string, uint256)
func (_FileStorage *FileStorageCaller) GetFile(opts *bind.CallOpts, _id *big.Int) (string, string, string, string, *big.Int, error) {
	var out []interface{}
	err := _FileStorage.contract.Call(opts, &out, "getFile", _id)

	if err != nil {
		return *new(string), *new(string), *new(string), *new(string), *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)
	out1 := *abi.ConvertType(out[1], new(string)).(*string)
	out2 := *abi.ConvertType(out[2], new(string)).(*string)
	out3 := *abi.ConvertType(out[3], new(string)).(*string)
	out4 := *abi.ConvertType(out[4], new(*big.Int)).(**big.Int)

	return out0, out1, out2, out3, out4, err

}

// GetFile is a free data retrieval call binding the contract method 0x2bfda313.
//
// Solidity: function getFile(uint256 _id) view returns(string, string, string, string, uint256)
func (_FileStorage *FileStorageSession) GetFile(_id *big.Int) (string, string, string, string, *big.Int, error) {
	return _FileStorage.Contract.GetFile(&_FileStorage.CallOpts, _id)
}

// GetFile is a free data retrieval call binding the contract method 0x2bfda313.
//
// Solidity: function getFile(uint256 _id) view returns(string, string, string, string, uint256)
func (_FileStorage *FileStorageCallerSession) GetFile(_id *big.Int) (string, string, string, string, *big.Int, error) {
	return _FileStorage.Contract.GetFile(&_FileStorage.CallOpts, _id)
}

// GetFileCount is a free data retrieval call binding the contract method 0xbab50cc9.
//
// Solidity: function getFileCount() view returns(uint256)
func (_FileStorage *FileStorageCaller) GetFileCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _FileStorage.contract.Call(opts, &out, "getFileCount")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetFileCount is a free data retrieval call binding the contract method 0xbab50cc9.
//
// Solidity: function getFileCount() view returns(uint256)
func (_FileStorage *FileStorageSession) GetFileCount() (*big.Int, error) {
	return _FileStorage.Contract.GetFileCount(&_FileStorage.CallOpts)
}

// GetFileCount is a free data retrieval call binding the contract method 0xbab50cc9.
//
// Solidity: function getFileCount() view returns(uint256)
func (_FileStorage *FileStorageCallerSession) GetFileCount() (*big.Int, error) {
	return _FileStorage.Contract.GetFileCount(&_FileStorage.CallOpts)
}

// StoreFile is a paid mutator transaction binding the contract method 0xe8dc408e.
//
// Solidity: function storeFile(string _user, string _filename, string _ipfsHash, string _description) returns(uint256)
func (_FileStorage *FileStorageTransactor) StoreFile(opts *bind.TransactOpts, _user string, _filename string, _ipfsHash string, _description string) (*types.Transaction, error) {
	return _FileStorage.contract.Transact(opts, "storeFile", _user, _filename, _ipfsHash, _description)
}

// StoreFile is a paid mutator transaction binding the contract method 0xe8dc408e.
//
// Solidity: function storeFile(string _user, string _filename, string _ipfsHash, string _description) returns(uint256)
func (_FileStorage *FileStorageSession) StoreFile(_user string, _filename string, _ipfsHash string, _description string) (*types.Transaction, error) {
	return _FileStorage.Contract.StoreFile(&_FileStorage.TransactOpts, _user, _filename, _ipfsHash, _description)
}

// StoreFile is a paid mutator transaction binding the contract method 0xe8dc408e.
//
// Solidity: function storeFile(string _user, string _filename, string _ipfsHash, string _description) returns(uint256)
func (_FileStorage *FileStorageTransactorSession) StoreFile(_user string, _filename string, _ipfsHash string, _description string) (*types.Transaction, error) {
	return _FileStorage.Contract.StoreFile(&_FileStorage.TransactOpts, _user, _filename, _ipfsHash, _description)
}

// FileStorageFileStoredIterator is returned from FilterFileStored and is used to iterate over the raw logs and unpacked data for FileStored events raised by the FileStorage contract.
type FileStorageFileStoredIterator struct {
	Event *FileStorageFileStored // Event containing the contract specifics and raw log

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
func (it *FileStorageFileStoredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(FileStorageFileStored)
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
		it.Event = new(FileStorageFileStored)
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
func (it *FileStorageFileStoredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *FileStorageFileStoredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// FileStorageFileStored represents a FileStored event raised by the FileStorage contract.
type FileStorageFileStored struct {
	Id          *big.Int
	User        string
	Filename    string
	IpfsHash    string
	Description string
	Timestamp   *big.Int
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterFileStored is a free log retrieval operation binding the contract event 0xd7c8e88746f19ff75345193695a84b53b611cf534f1052e1d582db408308f31b.
//
// Solidity: event FileStored(uint256 indexed id, string user, string filename, string ipfsHash, string description, uint256 timestamp)
func (_FileStorage *FileStorageFilterer) FilterFileStored(opts *bind.FilterOpts, id []*big.Int) (*FileStorageFileStoredIterator, error) {

	var idRule []interface{}
	for _, idItem := range id {
		idRule = append(idRule, idItem)
	}

	logs, sub, err := _FileStorage.contract.FilterLogs(opts, "FileStored", idRule)
	if err != nil {
		return nil, err
	}
	return &FileStorageFileStoredIterator{contract: _FileStorage.contract, event: "FileStored", logs: logs, sub: sub}, nil
}

// WatchFileStored is a free log subscription operation binding the contract event 0xd7c8e88746f19ff75345193695a84b53b611cf534f1052e1d582db408308f31b.
//
// Solidity: event FileStored(uint256 indexed id, string user, string filename, string ipfsHash, string description, uint256 timestamp)
func (_FileStorage *FileStorageFilterer) WatchFileStored(opts *bind.WatchOpts, sink chan<- *FileStorageFileStored, id []*big.Int) (event.Subscription, error) {

	var idRule []interface{}
	for _, idItem := range id {
		idRule = append(idRule, idItem)
	}

	logs, sub, err := _FileStorage.contract.WatchLogs(opts, "FileStored", idRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(FileStorageFileStored)
				if err := _FileStorage.contract.UnpackLog(event, "FileStored", log); err != nil {
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

// ParseFileStored is a log parse operation binding the contract event 0xd7c8e88746f19ff75345193695a84b53b611cf534f1052e1d582db408308f31b.
//
// Solidity: event FileStored(uint256 indexed id, string user, string filename, string ipfsHash, string description, uint256 timestamp)
func (_FileStorage *FileStorageFilterer) ParseFileStored(log types.Log) (*FileStorageFileStored, error) {
	event := new(FileStorageFileStored)
	if err := _FileStorage.contract.UnpackLog(event, "FileStored", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
