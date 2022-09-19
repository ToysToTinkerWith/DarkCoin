from pyteal import *


def approval_program():
    
    # don't need any real fancy initialization
    handle_creation = Return(Int(1))

    # i for the for loop
    i = ScratchVar(TealType.uint64) 

    

    # make sure that the contract receives at least as much as the 
    # amount it sends out + fees, and that each transaction sends
    # the algos to the contract's address

    assetCreator = AssetParam.creator(Txn.assets[i.load()])
    assetUnitName = AssetParam.unitName(Txn.assets[i.load()])
    assetHolding = AssetHolding.balance(Txn.sender(), Txn.assets[i.load()])
    

    check_valid = Seq(
        Assert(Txn.assets.length() == Int(6)),
        For(i.store(Int(0)), i.load() < Txn.assets.length() - Int(1), i.store(i.load() + Int(1))).Do(Seq(
            Assert(Gtxn[i.load()].xfer_asset() == Txn.assets[i.load()]),
            assetCreator,
            Assert(assetCreator.value() == Addr("AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE")),
            assetUnitName,
            Assert(Substring(assetUnitName.value(), Int(0), Int(4)) == Bytes("RAGE")),
            assetHolding,
            Assert(assetHolding.hasValue()),
        )),
        Int(1)
    )


    # opt into the RAGE 
    opt_in = Seq(
        Assert(Txn.sender() == Addr("Z3W4BTN5JQQ76AFQX2B2TGU3NPKGXF7TA7OJ4BYS4BK5FAITCED7AFRZXI")),
         For(i.store(Int(0)), i.load() < Txn.assets.length(), i.store(i.load() + Int(1))).Do(Seq(
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: Txn.assets[i.load()],
                TxnField.asset_receiver: Global.current_application_address(),
                TxnField.asset_amount: Int(0),
            }),
            InnerTxnBuilder.Submit()
         )),
         Int(1)
    )
    
    # send out the Osiris
    send_nft = Seq(
        
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[5],
            TxnField.asset_receiver: Txn.sender(),
            TxnField.asset_amount: Int(1),
        }),
        InnerTxnBuilder.Submit(),
       Int(1)
    )
        
    
    trade = Seq(
        Assert(check_valid),
        Assert(send_nft),
        Int(1)
      
    )
    

    # doesn't need anyone to opt in
    handle_optin = Return(Int(1))

    # only the creator can closeout the contract
    handle_closeout = Return(Int(1))

    # nobody can update the contract
    handle_updateapp =  Return(Txn.sender() == Global.creator_address())

    # only creator can delete the contract
    handle_deleteapp = Return(Txn.sender() == Global.creator_address())


    # handle the types of application calls
    program = Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.application_args[0] == Bytes("optin"), Return(opt_in)],
        [Txn.application_args[0] == Bytes("trade"), Return(trade)]
    )
    
    return program

# let clear state happen
def clear_state_program():
    program = Return(Int(1))
    return program
    


if __name__ == "__main__":
    with open("vote_approval.teal", "w") as f:
        compiled = compileTeal(approval_program(), mode=Mode.Application, version=5)
        f.write(compiled)

    with open("vote_clear_state.teal", "w") as f:
        compiled = compileTeal(clear_state_program(), mode=Mode.Application, version=5)
        f.write(compiled)