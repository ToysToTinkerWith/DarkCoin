from pyteal import *


def approval_program():
    
    # don't need any real fancy initialization
    handle_creation = Return(Seq(
        App.globalPut(Bytes("queued5"), Int(0)),
        App.globalPut(Bytes("queued20"), Int(0)),
        App.globalPut(Bytes("queued50"), Int(0)),
        App.globalPut(Bytes("queued100"), Int(0)),
        App.globalPut(Bytes("queued500"), Int(0)),
        Int(1)
        ))

    # i for the for loop
    i = ScratchVar(TealType.uint64)
    sendAmount = ScratchVar(TealType.uint64)

    check_valid = Seq(
        Assert(Btoi(Txn.application_args[2]) == App.globalGet(Concat(Bytes("queued"), Txn.application_args[1]))),
        If(Txn.application_args[1] == Bytes("5"),
        Assert(Gtxn[0].amount() == Int(5100000))),
        If(Txn.application_args[1] == Bytes("20"),
        Assert(Gtxn[0].amount() == Int(20400000))),
        If(Txn.application_args[1] == Bytes("50"),
        Assert(Gtxn[0].amount() == Int(51000000))),
        If(Txn.application_args[1] == Bytes("100"),
        Assert(Gtxn[0].amount() == Int(102000000))),
        If(Txn.application_args[1] == Bytes("500"),
        Assert(Gtxn[0].amount() == Int(510000000))),
        Assert(Gtxn[0].receiver() == Global.current_application_address()),
        Int(1)
    )

     # send out the Osiris
    send_mix = Seq(
        sendAmount.store(Int(0)),
        Assert(Txn.accounts.length() == Int(4)),
        If(Txn.application_args[1] == Bytes("5"),
        sendAmount.store(Int(5000000))),
        If(Txn.application_args[1] == Bytes("20"),
        sendAmount.store(Int(20000000))),
        If(Txn.application_args[1] == Bytes("50"),
        sendAmount.store(Int(50000000))),
        If(Txn.application_args[1] == Bytes("100"),
        sendAmount.store(Int(100000000))),
        If(Txn.application_args[1] == Bytes("500"),
        sendAmount.store(Int(500000000))),
        For(i.store(Int(0)), i.load() < Txn.accounts.length(), i.store(i.load() + Int(1))).Do(Seq(
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.receiver: Txn.accounts[i.load() + Int(1)],
            TxnField.amount: sendAmount.load()
        }),
        InnerTxnBuilder.Submit(),
        )),
        Int(1)
    )


    # opt into the RAGE 
    write_state = Seq(
        If(App.globalGet(Concat(Bytes("queued"), Txn.application_args[1])) >= Int(3),
        App.globalPut(Concat(Bytes("queued"), Txn.application_args[1]), Int(0)),
        App.globalPut(Concat(Bytes("queued"), Txn.application_args[1]), App.globalGet(Concat(Bytes("queued"), Txn.application_args[1])) + Int(1))),
        Int(1)
    )
    
   
        
    
    mix = Seq(
        Assert(check_valid),
        If(App.globalGet(Concat(Bytes("queued"), Txn.application_args[1])) >= Int(3), Assert(send_mix)),
        Assert(write_state),
        
        
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
        [Txn.application_args[0] == Bytes("mix"), Return(mix)]
        
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